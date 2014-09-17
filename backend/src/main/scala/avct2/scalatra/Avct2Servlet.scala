package avct2.scalatra

import avct2.schema.Utilities._
import avct2.schema.{Race, Role, Tables}
import org.json4s.DefaultFormats
import org.scalatra._
import org.scalatra.json._

import scala.slick.driver.HsqldbDriver.simple._

class Avct2Servlet(db: Database) extends ScalatraServlet with NativeJsonSupport {

  protected implicit val jsonFormats = DefaultFormats

  get("/") {
    redirect("/gui") // static files will be served
  }

  get("/clip") {
    contentType = formats("json")
    db.withSession { implicit session =>
      (for {
        (c, s) <- Tables.clip leftJoin Tables.studio on (_.studioId === _.studioId)
      } yield (c.clipId, c.file, c.race, c.grade, c.role, c.size, c.length, c.thumb.isNotNull, s.name.?)).
      list.map(((clipId: Int, file: String, race: Race.Value, grade: Int, role: Role.ValueSet, size: Int, length: Int, thumbSet: Boolean, studio: Option[String]) => {
        val tags = (for {
          (ct, t) <- Tables.clipTag.filter(_.clipId === clipId) leftJoin Tables.tag on (_.tagId === _.tagId)
        } yield t.name).list
        val record = recordFormat({ val ts = Tables.record.filter(_.clipId === clipId).map(_.timestamp); (ts.length, ts.max).shaped.run }) // currently buggy due to https://github.com/slick/slick/issues/630
        Map("id" -> clipId, "file" -> file, "studio" -> studio, "race" -> race.toString, "role" -> role.map(_.toString), "grade" -> grade, "size" -> size, "duration" -> length, "tags" -> tags, "record" -> record, "thumbSet" -> thumbSet) // Enum-s must be toString-ed, otherwise json4s will fuck things up
      }).tupled)
    }
  }

  get("/clip/:id/thumb") {
    contentType = "image/jpeg"
    val id = params("id").toInt
    db.withSession { implicit session =>
      val is = Tables.clip.filter(_.clipId === id).map(_.thumb).first.getBinaryStream
      org.scalatra.util.io.copy(is, response.getOutputStream)
    }
  }

  post("/clip/:id/edit") {
    val id = params("id").toInt
    params("key") match {
      case "studio" => { // auto-creation included
        val studio = params("value")
        db.withSession { implicit session =>
          Tables.clip.filter(_.clipId === id).map(_.studioId).update(getStudioOrCreate(studio))
        }
      }
      case "race" => {

      }
      case "role" => {

      }
      case "grade" => {

      }
      case "duration" => {

      }
      case "tags" => {

      }
    }

  }
  
}
