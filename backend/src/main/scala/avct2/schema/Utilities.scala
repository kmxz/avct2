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
  val unknown = Value("Unknown")
  Value("Chinese")
  Value("Other Asian")
  Value("Other races")
  val mct = MappedColumnType.base[Value, Int](_.id, apply)
}

case class Dimensions(width: Int, height: Int) {
  def min = Math.min(width, height)
}

object Dimensions {
  val mct = MappedColumnType.base[Dimensions, Int](dim => dim.width * 32768 + dim.height, int => new Dimensions(int / 32768, int % 32768))
}

object Utilities {

  val STR_VA = "V/A" // compat with the original Java implementation

  // clean those studios which have no clips
  def orphanStudioCleanup(implicit session: Session) = {
    (for {
      studio <- Tables.studio if !Tables.clip.filter(_.studioId === studio.studioId).exists
    } yield studio).delete
  }

  // clean those tags which has no clips or child tags
  def orphanTagCleanup(implicit session: Session) = {
    val tags = for {
      tag <- Tables.tag if (!Tables.clipTag.filter(_.tagId === tag.tagId).exists) && (!Tables.tagRelationship.filter(_.parentTag === tag.tagId).exists)
    } yield tag
    tags.map(_.tagId).list.foreach(tagId => {
      Tables.tagRelationship.filter(_.childTag === tagId).delete
    })
    tags.delete
  }

  // fuck scala, i cannot use partial application and implicit parameter together, so have to stick with 3 params
  def getParentOrChildTags(from: Int, parent: Boolean, recursive: Boolean)(implicit session: Session): Set[Int] = {
    val results = Tables.tagRelationship.filter(row => (if (parent) row.childTag else row.parentTag) === from).map(if (parent) _.parentTag else _.childTag).list
    if (recursive) {
      results.map(single => getParentOrChildTags(single, parent, true) + single).fold(Set[Int]())(_ ++ _)
    } else {
      results.toSet
    }
  }

  def legalTagParent(self: Int, proposedParent: Int)(implicit session: Session) = {
    !((self == proposedParent) || getParentOrChildTags(self, false, true).contains(proposedParent))
  }

}
