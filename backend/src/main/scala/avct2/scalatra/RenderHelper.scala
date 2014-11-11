package avct2.scalatra

import java.io.File

import avct2.desktop.OpenFile._
import avct2.schema._

import scala.slick.driver.HsqldbDriver.simple._

trait RenderHelper {

  // to be used with renderClip
  def queryClip(filter: TableQuery[Clip] => Query[Clip, _, Seq])(implicit session: Session) = { // actually I should fill the second type parameter of return type, instead of leaving _. but it's too long so I ignored that
    filter(Tables.clip).map(row => (row.clipId, row.file, row.studioId, row.race, row.grade, row.role, row.size, row.length, row.thumb.isNotNull, row.sourceNote))
  }

  // to be used with queryClip
  def renderClip(tuple: (Int, String, Option[Int], Race.Value, Int, Role.ValueSet, Int, Int, Boolean, String))(implicit session: Session) = tuple match {
    case (clipId, file, studio, race, grade, role, size, length, thumbSet, sourceNote) =>
      val tags = Tables.clipTag.filter(_.clipId === clipId).map(_.tagId).list
      val record = recordFormat({ val ts = Tables.record.filter(_.clipId === clipId).map(_.timestamp); (ts.length, ts.max).shaped.run }) // currently buggy due to https://github.com/slick/slick/issues/630
      val f = new File(file)
      Map("id" -> clipId, "path" -> f.getPath, "file" -> f.getName, "studio" -> studio, "race" -> race.toString, "role" -> role.map(_.toString), "grade" -> grade, "size" -> size, "duration" -> length, "tags" -> tags, "record" -> record, "thumbSet" -> thumbSet, "sourceNote" -> sourceNote) // Enum-s must be toString-ed, otherwise json4s will fuck things up
  }

  val recordFormat = ((count: Int, latest: Option[Int]) => {
    if (count == 0) "never" else (
      count.toString + ", last played " + {
        val days = (System.currentTimeMillis / 1000 - latest.get) / (24 * 60 * 60)
        if (days < 1) "today" else { days.toString + " days ago" }
      }
    )
  }).tupled

  def openFile(id: Int, inFolder: Boolean)(implicit session: Session) = {
    Tables.clip.filter(_.clipId === id).map(_.file).firstOption match {
      case Some(fileName) => {
        val f = new File(fileName)
        if (f.isFile) {
          if ((if (inFolder) open else openInFolder)(f)) None else Some((501, "System cannot open the file."))
        } else Some((503, "File does not exist."))
      }
      case None => Some((404, "Clip does not exist."))
    }
  }

  def openFileHelper(db: Database, raiseError: ((Int, String)) => Unit, idString: String, inFolder: Boolean) = {
    db.withSession { implicit session =>
      openFile(idString.toInt, inFolder) match {
        case Some(err) => raiseError(err)
        case None =>
      }
    }
  }

}
