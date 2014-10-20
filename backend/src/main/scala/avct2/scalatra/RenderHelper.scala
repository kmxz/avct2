package avct2.scalatra

import avct2.schema.Utilities._
import avct2.schema._

import java.io.File
import scala.slick.driver.HsqldbDriver.simple._

trait RenderHelper {

  // to be used with renderClip
  def queryClip(filter: TableQuery[Clip] => Query[Clip, _, Seq])(implicit session: Session) = { // actually I should fill the second type parameter of return type, instead of leaving _. but it's too long so I ignored that
      filter(Tables.clip).map(row => (row.clipId, row.file, row.studioId, row.race, row.grade, row.role, row.size, row.length, row.thumb.isNotNull))
  }

  // to be used with queryClip
  def renderClip(tuple: (Int, String, Option[Int], Race.Value, Int, Role.ValueSet, Int, Int, Boolean))(implicit session: Session) = tuple match {
    case (clipId, file, studio, race, grade, role, size, length, thumbSet) =>
      val tags = Tables.clipTag.filter(_.clipId === clipId).map(_.tagId).list
      val record = recordFormat({ val ts = Tables.record.filter(_.clipId === clipId).map(_.timestamp); (ts.length, ts.max).shaped.run }) // currently buggy due to https://github.com/slick/slick/issues/630
      Map("id" -> clipId, "file" -> new File(file).getName, "studio" -> getStudioName(studio), "race" -> race.toString, "role" -> role.map(_.toString), "grade" -> grade, "size" -> size, "duration" -> length, "tags" -> tags, "record" -> record, "thumbSet" -> thumbSet) // Enum-s must be toString-ed, otherwise json4s will fuck things up
  }

  val recordFormat = ((count: Int, latest: Option[Int]) => {
    if (count == 0) "never" else (
      count.toString + ", last played " + {
        val days = (System.currentTimeMillis / 1000 - latest.get) / (24 * 60 * 60)
        if (days < 1) "today" else { days.toString + " days ago" }
      }
    )
  }).tupled

}
