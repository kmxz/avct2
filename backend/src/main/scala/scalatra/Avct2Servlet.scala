package avct2.scalatra

import org.scalatra._
import org.scalatra.json._
import scala.slick.driver.SQLiteDriver.simple._
import org.json4s.DefaultFormats

import avct2.schema.{Tables, Role}
import avct2.schema.Race.Race

class Avct2Servlet(db: Database) extends ScalatraServlet with NativeJsonSupport {

  protected implicit val jsonFormats = DefaultFormats

  get("/") {
    redirect("/gui") // static files will be served
  }

  get("/clip") {
    contentType = formats("json")
    db.withSession {
      implicit session =>
        (for {
          (c, s) <- Tables.clip leftJoin Tables.studio on (_.studioId === _.studioId)
        } yield (c.clipId, c.file, c.race, c.grade, c.role, c.size, c.length, s.name.?)).
        list.map(((clipId: Int, file: String, race: Race, grade: Int, role: Role, size: Int, length: Int, studio: Option[String]) => {
          val tags = (for {
            (ct, t) <- Tables.clipTag.filter(_.clipId === clipId) leftJoin Tables.tag on (_.tagId === _.tagId)
          } yield (t.name)).list
          Map("id" -> clipId, "file" -> file, "studio" -> studio, "race" -> race, "role" -> role, "grade" -> grade, "size" -> size, "duration" -> length, "tags" -> tags)
        }).tupled)
    }
  }
  
}
