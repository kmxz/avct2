package avct2.scalatra

import org.json4s.DefaultFormats
import org.scalatra._
import org.scalatra.json._
import scala.slick.driver.HsqldbDriver.simple._

import avct2.schema.Utilities._
import avct2.schema.{Role, Race, Tables}
import avct2.desktop.OpenFile._

class Avct2Servlet(db: Database) extends ScalatraServlet with NativeJsonSupport with RenderHelper {

  protected implicit val jsonFormats = DefaultFormats

  get("/") {
    redirect("/webui") // static files will be served
  }

  get("/clip") {
    contentType = formats("json")
    db.withSession { implicit session =>
      queryClip(identity).list.map(renderClip).map(clip => (clip("id").toString, clip.-("id")))toMap
    }
  }

  get("/clip/:id/thumb") {
    contentType = "image/jpeg"
    val id = params("id").toInt
    db.withSession { implicit session =>
      Tables.clip.filter(_.clipId === id).map(_.thumb).first match {
        case Some(thumb) => org.scalatra.util.io.copy(thumb.getBinaryStream, response.getOutputStream)
        case None => status_=(404)
      }
    }
  }

  post("/clip/:id/open") {
    val id = params("id").toInt
    db.withSession { implicit session => openFile(id, false) }
  }

  post("/clip/:id/folder") {
    val id = params("id").toInt
    db.withSession { implicit session => openFile(id, true) }
  }

  post("/clip/:id/edit") {
    val id = params("id").toInt
    db.withSession { implicit session =>
      params("key") match {
        case "studio" => {
          val studio = params("value").toInt
          Tables.clip.filter(_.clipId === id).map(_.studioId).update(Some(studio))
        }
        case "race" => {
          val race = Race.withName(params("race"))
          Tables.clip.filter(_.clipId === id).map(_.race).update(race)
        }
        case "role" => {
          val roles = multiParams("value")
          val roleSet = Role.ValueSet(roles.map(Role.withName): _*)
          Tables.clip.filter(_.clipId === id).map(_.role).update(roleSet)
        }
        case "grade" => {
          val grade = params("value").toInt
          Tables.clip.filter(_.clipId === id).map(_.grade).update(grade)
        }
        case "duration" => {
          val length = params("value").toInt
          Tables.clip.filter(_.clipId === id).map(_.length).update(length)
        }
        case "tags" => {
          val tags = multiParams("value").map(_.toInt)
          Tables.clipTag.filter(_.clipId === id).delete // remove older ones first
          Tables.clipTag.insertAll(getParentTags(id, true).map(tag => (id, tag)): _*)
        }
      }
      renderClip(queryClip(query => query.filter(_.clipId === id)).first)
    }
  }

  get("/tag") {
    contentType = formats("json")
    db.withSession { implicit session =>
      Tables.tag.map(tag => (tag.tagId, tag.name)).list.map(tag => (tag._1.toString, Map("name" -> tag._2, "parent" -> getParentTags(tag._1, false)))).toMap
    }
  }

  get("/tag/:id") {
    contentType = formats("json")
    // TODO
  }

  post("/tag/create") {
    contentType = formats("json")
    val name = params("name")
    db.withSession { implicit session =>
      (Tables.tag returning Tables.tag) += (None, name)
    }
  }

  get("/studio") {
    contentType = formats("json")
    db.withSession { implicit session =>
      Tables.studio.map(studio => (studio.studioId, studio.name)).list.map(studio => (studio._1.toString, studio._2)).toMap
    }
  }

}
