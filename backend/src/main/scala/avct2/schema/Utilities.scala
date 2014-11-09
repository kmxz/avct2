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
  Value("Other Asian")
  Value("Other races")
  val mct = MappedColumnType.base[Value, Int](_.id, apply)
}

object Utilities {

  val STR_VA = "V/A" // compat with the original Java implementation

  // this function is used to clean those orphan studios // TODO: haven't decided where to call
  def orphanStudioCleanup(implicit session: Session) = {
    (for {
      studio <- Tables.studio if !Tables.clip.filter(_.studioId === studio.studioId).exists
    } yield studio).delete
  }

  def getParentTags(tagId: Int, recursive: Boolean)(implicit session: Session) = {
    val direct = Tables.tagRelationship.filter(_.parentTag === tagId).map(_.childTag).list
    if (recursive) {
      def recParents(child: Int): Set[Int] = { // the client should do this, but let's make it more secure
        val parents = Tables.tagRelationship.filter(_.childTag === child).map(_.parentTag).list
          parents.foldLeft (Set(child)) { _ ++ recParents(_) }
      }
      direct.map(recParents).reduce(_ ++ _).toSeq
    } else {
      direct
    }
  }

}
