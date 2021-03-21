package avct2.schema

import slick.jdbc.HsqldbProfile.api._

import MctImplicits._
import scala.async.Async.{async, await}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

object Role extends Enumeration {
  Value("Vanilla")
  Value("M self")
  Value("F self")
  Value("M/m")
  Value("M/f")
  Value("F/m")
  Value("F/f")
  Value("MtF/m")
  def mct = MappedColumnType.base[ValueSet, Int](_.toBitMask(0).toInt, int => ValueSet.fromBitMask(Array(int.toLong)))
}

object Race extends Enumeration {
  val unknown = Value("Unknown")
  Value("Chinese")
  Value("Other Asian")
  Value("Other races")
  def mct = MappedColumnType.base[Value, Int](_.id, apply)
}

object TagType extends Enumeration {
  val special = Value("Special")
  val studio = Value("Studio")
  val content = Value("Content")
  Value("Format")
  def mct = MappedColumnType.base[Value, Int](_.id, apply)
}

case class Dimensions(width: Int, height: Int) {
  def min = Math.min(width, height)
}

object Dimensions {
  def mct = MappedColumnType.base[Dimensions, Int](dim => dim.width * 32768 + dim.height, int => new Dimensions(int / 32768, int % 32768))
}

object MctImplicits {
  implicit def roleMct = Role.mct
  implicit def raceMct = Race.mct
  implicit def tagTypeMct = TagType.mct
  implicit def dimensionsMct = Dimensions.mct
}

object Utilities {

  val STR_VA = "V/A" // compat with the original Java implementation

  // clean those tags which has no clips or child tags
  def orphanTagCleanup(db: Database) = async {
    val tags = for {
      tag <- Tables.tag if (!Tables.clipTag.filter(_.tagId === tag.tagId).exists) && (!Tables.tagRelationship.filter(_.parentTag === tag.tagId).exists)
    } yield tag
    val tagIds = await(db.run(tags.map(_.tagId).result))
    await(db.run(DBIO.seq(tagIds.map(tagId => {
      Tables.tagRelationship.filter(_.childTag === tagId).delete
    }): _*)))
    await(db.run(tags.delete))
  }

  // oops, i cannot use partial application and implicit parameter together, so have to stick with 3 params
  def getParentOrChildTags(from: Int, parent: Boolean, recursive: Boolean)(implicit db: Database): Future[Set[Int]] = async {
    val results = await(db.run((if (parent) Tables.tagRelationship.filter(row => row.childTag=== from).map( _.parentTag) else Tables.tagRelationship.filter(row => row.parentTag === from).map(_.childTag)).result))
    if (recursive) {
      await(Future.sequence(results.map(single => getParentOrChildTags(single, parent, true).map(_ + single)))).fold(Set[Int]())(_ ++ _)
    } else {
      results.toSet
    }
  }

  def legalTagParent(self: Int, proposedParent: Int)(implicit db: Database): Future[Boolean] = async {
    val parentType = await(db.run(Tables.tag.filter(_.tagId === proposedParent).map(_.tagType).result.head))
    val selfType = await(db.run(Tables.tag.filter(_.tagId === self).map(_.tagType).result.head))
    (parentType == selfType) && !((self == proposedParent) || await(getParentOrChildTags(self, false, true)).contains(proposedParent))
  }

}
