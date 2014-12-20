package avct2.scalatra

import java.io.File

import avct2.Avct2Conf
import avct2.desktop.OpenFile._
import avct2.schema.Utilities._
import avct2.schema._
import org.json4s.JsonAST.JNull
import org.scalatra.servlet.{FileUploadSupport, MultipartConfig}

import scala.compat.Platform
import scala.slick.driver.HsqldbDriver.ReturningInsertInvokerDef
import scala.slick.driver.HsqldbDriver.simple._
import scala.slick.lifted

class Avct2Servlet extends NoCacheServlet with FileUploadSupport with JsonSupport with RenderHelper {

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
          halt(412, "Working DB connection changed.")
        }
      }
    }
  }

  get("/players") { // available players
    Avct2Conf.getPlayers
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

  get("/clip/:id/history") {
    val id = params("id").toInt
    db.withSession { implicit session =>
      Tables.record.filter(_.clipId === id).map(_.timestamp).list
    }
  }

  def openFileHelper(opener: (File => Boolean), record: Boolean) = {
    val id = params("id").toInt
    db.withSession { implicit session =>
      openFile(id, opener) match {
        case Some(err) => halt(err._1, err._2)
        case None => {
          if (record) {
            Tables.record.map(row => (row.clipId, row.timestamp)).insert((id, (Platform.currentTime / 1000).toInt))
          }
          JNull // nothing to return
        }
      }
    }
  }

  post("/clip/:id/open") {
    openFileHelper(open, true)
  }

  post("/clip/:id/openwith") {
    val player = params("player")
    if (!Avct2Conf.getPlayers.contains(player)) {
      halt(404, "Such player is not registered.")
    }
    val playerFile = new File(player)
    if (!playerFile.isFile) {
      halt(503, "Player executable does not exist.")
    }
    openFileHelper(openWith(_, playerFile), true)
  }

  post("/clip/:id/folder") {
    openFileHelper(openInFolder, false)
  }

  post("/clip/:id/edit") {
    val id = params("id").toInt
    val value = params("value")
    db.withSession { implicit session =>
      val clipRow = Tables.clip.filter(_.clipId === id)
      if (!clipRow.exists.run) {
        halt(404, "Clip does not exist.")
      }
      params("key") match {
        case "studio" => {
          val studio = value.toInt
          if (!Tables.studio.filter(_.studioId === studio).exists.run) {
            halt(404, "Studio does not exist.")
          }
          clipRow.map(_.studioId).update(Some(studio))
        }
        case "race" => {
          try {
            val race = Race.withName(value)
            clipRow.map(_.race).update(race)
          } catch {
            case _: NoSuchElementException => halt(404, "Race does not exist.")
          }
        }
        case "role" => {
          val roles = json[Seq[String]](value)
          try {
            val roleSet = Role.ValueSet(roles.map(Role.withName): _*)
            clipRow.map(_.role).update(roleSet)
          } catch {
            case _: NoSuchElementException => halt(404, "Role does not exist.")
          }
        }
        case "grade" => {
          val grade = value.toInt
          clipRow.map(_.grade).update(grade)
        }
        case "duration" => {
          val length = value.toInt
          clipRow.map(_.length).update(length)
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
        case "sourceNote" => {
          clipRow.map(_.sourceNote).update(value)
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

  def createHelper(filter: (String => lifted.Query[_, (Option[Int], String), Seq]), returningInvoker: ReturningInsertInvokerDef[(Option[Int], String), (Option[Int], String)]) = {
    // return inserted id
    val name = params("name")
    if (name.length < 1) {
      halt(400, "Name too short.")
    }
    db.withSession { implicit session =>
      if (filter(name).exists.run) {
        halt(409, "Name already exists.")
      }
      (returningInvoker +=(None, name)) match {
        case (Some(id), _) => Map("id" -> id)
        case _ => halt(500, "Insertion failed.")
      }
    }
  }

  post("/tag/create") {
    createHelper(name => Tables.tag.filter(_.name === name), Tables.tag returning Tables.tag)
  }

  get("/studio") {
    db.withSession { implicit session =>
      Tables.studio.map(studio => (studio.studioId, studio.name)).list.map(studio => (studio._1.toString, studio._2)).toMap
    }
  }

  post("/studio/create") {
    createHelper(name => Tables.studio.filter(_.name === name), Tables.studio returning Tables.studio)
  }

}
