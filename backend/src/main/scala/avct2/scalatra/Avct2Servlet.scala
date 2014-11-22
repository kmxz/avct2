package avct2.scalatra

import java.io.File

import avct2.Avct2Conf
import avct2.schema.Utilities._
import avct2.schema.{Race, Role, Tables}
import org.json4s.DefaultFormats
import org.json4s.JsonAST.JNull
import org.scalatra._
import org.scalatra.json._
import org.scalatra.servlet.{FileUploadSupport, MultipartConfig}

import scala.slick.driver.HsqldbDriver.simple._

class Avct2Servlet extends ScalatraServlet with FileUploadSupport with JsonSupport with RenderHelper {

  configureMultipartHandling(MultipartConfig())

  def db() = {
    Avct2Conf.dbConnection.get.database
  }

  before() {
    contentType = formats("json")
    Avct2Conf.dbConnection match {
      case None => halt(412, "Establish a database connection first.")
      case Some(conn) => {
        val header = request.getHeader("X-Db-Connection-Id")
        if (header != null && header != conn.id) {
          halt(412, "Working DB connection changed.");
        }
      }
    }
  }

  get("/players") { // available players
    Avct2Conf.getPlayers.map({ player => new File(player).getName; })
  }

  get("/clip") {
    db.withSession { implicit session =>
      queryClip(identity).list.map(renderClip)
    }
  }

  get("/clip/:id/thumb") {
    contentType = "image/jpeg" // override
    val id = params("id").toInt
    db.withSession { implicit session =>
      Tables.clip.filter(_.clipId === id).map(_.thumb).firstOption match {
        case Some(Some(thumb)) => org.scalatra.util.io.copy(thumb.getBinaryStream, response.getOutputStream)
        case Some(None) => halt(503, "Image not set.")
        case None => halt(404, "Clip does not exist.")
      }
    }
  }

  def openFileHelper(inFolder: Boolean) = {
    db.withSession { implicit session =>
      openFile(params("id").toInt, inFolder) match {
        case Some(err) => halt(err._1, err._2)
        case None => JNull // nothing to return
      }
    }
  }

  post("/clip/:id/open") {
    openFileHelper(false)
  }

  post("/clip/:id/folder") {
    openFileHelper(true)
  }

  post("/clip/:id/edit") {
    val id = params("id").toInt
    val value = params("value")
    db.withSession { implicit session =>
      if (!Tables.clip.filter(_.clipId === id).exists.run) {
        halt(404, "Clip does not exist.")
      }
      params("key") match {
        case "studio" => {
          val studio = value.toInt
          // check if studio exists
          if (!Tables.studio.filter(_.studioId === studio).exists.run) {
            halt(404, "Studio does not exist.")
          }
          Tables.clip.filter(_.clipId === id).map(_.studioId).update(Some(studio))
        }
        case "race" => {
          try {
            val race = Race.withName(value)
            Tables.clip.filter(_.clipId === id).map(_.race).update(race)
          } catch {
            case _: NoSuchElementException => halt(404, "Race does not exist.")
          }
        }
        case "role" => {
          val roles = json[Seq[String]](value)
          try {
            val roleSet = Role.ValueSet(roles.map(Role.withName): _*)
            Tables.clip.filter(_.clipId === id).map(_.role).update(roleSet)
          } catch {
            case _: NoSuchElementException => halt(404, "Role does not exist.")
          }
        }
        case "grade" => {
          val grade = value.toInt
          Tables.clip.filter(_.clipId === id).map(_.grade).update(grade)
        }
        case "duration" => {
          val length = value.toInt
          Tables.clip.filter(_.clipId === id).map(_.length).update(length)
        }
        case "tags" => {
          val tags = json[Seq[Int]](value)
          Tables.clipTag.filter(_.clipId === id).delete // remove older ones first
          if (!tags.map(tag => Tables.tag.filter(_.tagId === tag).exists.run).reduce(_ && _)) {
            halt(404, "Tag does not exist.")
          }
          val tagsIncludingParents = tags.map(tag => getParentOrChildTags(tag, true, true) + tag).reduce(_ ++ _).toSeq // duplicates removed
          Tables.clipTag.map(row => (row.clipId, row.tagId)).insertAll(tagsIncludingParents.map(tag => (id, tag)): _*)
        }
      }
      // render the new clip
      renderClip(queryClip(query => query.filter(_.clipId === id)).first)
    }
  }

  get("/tag") {
    db.withSession { implicit session =>
      Tables.tag.map(tag => (tag.tagId, tag.name)).list.map(tag => Map("id" -> tag._1, "name" -> tag._2, "parent" -> getParentOrChildTags(tag._1, true, false)))
    }
  }

  post("/tag/:id/edit") {
    val id = params("id").toInt
    val name = params("name")
    if (name.length < 1) {
      halt(400, "Name too short.")
    }
    db.withSession { implicit session =>
      if (!Tables.tag.filter(_.tagId === id).exists.run) {
        halt(404, "Tag does not exist.")
      }
      if (Tables.tag.filter(tag => (tag.tagId =!= id) && (tag.name === name)).exists.run) {
        halt(409, "Tag name already exists.")
      }
      Tables.tag.filter(_.tagId === id).map(_.name).update(name)
      JNull // nothing to return
    }
  }

  post("/tag/:id/parent") {
    val id = params("id").toInt
    val parents = json[Seq[Int]](params("parent")).toSet // remove duplicates
    db.withSession { implicit session =>
      if (!Tables.tag.filter(_.tagId === id).exists.run) {
        halt(404, "Child tag does not exist.")
      }
      if (!parents.map(tag => Tables.tag.filter(_.tagId === tag).exists.run).fold(true)(_ && _)) {
        halt(404, "Parent tag does not exist.")
      }
      if (!parents.map(tag => legalTagParent(id, tag)).fold(true)(_ && _)) {
        halt(409, "Forming cycles are not allowed.")
      }
      Tables.tagRelationship.filter(_.childTag === id).delete
      Tables.tagRelationship.map(row => (row.parentTag, row.childTag)).insertAll(parents.toSeq.map(parent => (parent, id)): _*)
      JNull // nothing to return
    }
  }

  post("/tag/create") {
    // return inserted id
    val name = params("name")
    if (name.length < 1) {
      halt(400, "Name too short.")
    }
    db.withSession { implicit session =>
      if (Tables.tag.filter(_.name === name).exists.run) {
        halt(409, "Tag name already exists.")
      }
      ((Tables.tag returning Tables.tag) +=(None, name)) match {
        case (Some(id), _) => Map("id" -> id)
        case _ => halt(500, "Insertion failed.")
      }
    }
  }

  get("/studio") {
    db.withSession { implicit session =>
      Tables.studio.map(studio => (studio.studioId, studio.name)).list.map(studio => (studio._1.toString, studio._2)).toMap
    }
  }

}
