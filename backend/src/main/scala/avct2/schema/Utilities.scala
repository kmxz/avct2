package avct2.schema

import scala.slick.driver.HsqldbDriver.simple._

object Role extends Enumeration {
  val Vanilla, MSelf, FSelf, Mm, Mf, Fm, Ff = Value
  val mct = MappedColumnType.base[ValueSet, Int](_.toBitMask(0).toInt, int => ValueSet.fromBitMask(Array(int.toLong)))
}

object Race extends Enumeration {
  val Unknown, Chinese, Asian, Other = Value
  val mct = MappedColumnType.base[Value, Int](_.id, apply)
}

object Utilities {
  def getStudioOrCreate(name: String)(implicit session: Session) = {
    Tables.studio.filter(_.name === name).map(_.studioId).firstOption match {
      case Some(id) => id
      case None => {
        Tables.studio.map(_.name).insert(name)
        (Tables.studio returning Tables.studio.map(_.studioId)) += (None, name)
      }
    }
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