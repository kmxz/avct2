package avct2.scalatra

import avct2.schema.Race.Race
import avct2.schema.{Role, Tables}
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
      } yield (c.clipId, c.file, c.race, c.grade, c.role, c.size, c.length, s.name.?)).
      list.map(((clipId: Int, file: String, race: Race, grade: Int, role: Role, size: Int, length: Int, studio: Option[String]) => {
        val tags = (for {
          (ct, t) <- Tables.clipTag.filter(_.clipId === clipId) leftJoin Tables.tag on (_.tagId === _.tagId)
        } yield t.name).list
        Map("id" -> clipId, "file" -> file, "studio" -> studio, "race" -> race, "role" -> role, "grade" -> grade, "size" -> size, "duration" -> length, "tags" -> tags)
      }).tupled)
    }
  }

  get("/clip/:id/thumb") {
    contentType = "image/jpeg"
    val id = params("id").toInt
    db.withSession { implicit session =>
      val is = Tables.clip.filter(_.clipId === id).map(row => row.thumb).first.getBinaryStream
      org.scalatra.util.io.copy(is, response.getOutputStream)
    }
  }
  
}
