package avct2.schema

import scala.slick.driver.HsqldbDriver.simple._

object Role extends Enumeration {
  Value("Vanilla")
  Value("M self")
  Value("F self")
  Value("M/m")
  Value("M/f")
  Value("F/m")
  Value("F/f")
  val mct = MappedColumnType.base[ValueSet, Int](_.toBitMask(0).toInt, int => ValueSet.fromBitMask(Array(int.toLong)))
}

object Race extends Enumeration {
  Value("Unknown")
  Value("Chinese")
  Value("Other Asia")
  Value("Other races")
  val mct = MappedColumnType.base[Value, Int](_.id, apply)
}

object Utilities {

  val STR_VA = "V/A" // compat with the original Java implementation

  def getStudioOrCreate(name: String)(implicit session: Session) = name match {
    case STR_VA => 0
    case _ =>
      Tables.studio.filter (_.name === name).map (_.studioId).firstOption match {
        case Some (id) => id
        case None => {
        (Tables.studio returning Tables.studio.map (_.studioId) ) += (None, name)
        }
      }
  }

  def getStudioName(id: Option[Int])(implicit session: Session) = id match {
    case None => None
    case Some(0) => Some(STR_VA)
    case Some(studio) => Tables.studio.filter(_.studioId === studio).map(_.name).first
  }

  // this function is used to clean those orphan studios TODO: haven't decided where to call
  def orphanStudioCleanup(implicit session: Session) = {
    (for {
      studio <- Tables.studio if !Tables.clip.filter(_.studioId === studio.studioId).exists
    } yield studio).delete
  }

}