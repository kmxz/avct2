package avct2.schema

import java.sql.Blob
import scala.slick.driver.SQLiteDriver.simple._
import scala.slick.lifted.{TableQuery, Tag => T}

object Role { // I really should rewrite this section
  final val vanillaMask = 1 << 0;
  final val mSelfMask = 1 << 1;
  final val fSelfMask = 1 << 2;
  final val mMMask = 1 << 3;
  final val mFMask = 1 << 4;
  final val fMMask = 1 << 5;
  final val fFMask = 1 << 6;
  def apply(i: Int) = {
    new Role((i & vanillaMask) != 0, (i & mSelfMask) != 0, (i & fSelfMask) != 0, (i & mMMask) != 0, (i & mFMask) != 0, (i & fMMask) != 0, (i & fFMask) != 0)
  }
  val mct = MappedColumnType.base[Role, Int]({ r => r.toInt }, { i => Role(i) })
}

case class Role(vanilla: Boolean, mSelf: Boolean, fSelf: Boolean, mM: Boolean, mF: Boolean, fM: Boolean, fF: Boolean) {
  def toInt() = {
    var i = 0
    if (vanilla) { i |= Role.vanillaMask }
    if (mSelf) { i |= Role.mSelfMask }
    if (fSelf) { i |= Role.fSelfMask }
    if (mM) { i |= Role.mMMask }
    if (mF) { i |= Role.mFMask }
    if (fM) { i |= Role.fMMask }
    if (fF) { i |= Role.fFMask }
    i
  }
}

object Race extends Enumeration {
  type Race = Value
  val Unknown, Chinese, Asian, Other = Value
  val mct = MappedColumnType.base[Value, Int](_.id, this.apply)
}

class Tag(tag: T) extends Table[(Int, String, Boolean)](tag, "tag") {
  def tagId = column[Int]("tag_id", O.PrimaryKey, O.AutoInc)
  def name = column[String]("name")
  def meta = column[Boolean]("meta")
  def * = (tagId, name, meta)
}

class TagRelationship(tag: T) extends Table[(Int, Int)](tag, "tag_relationship") {
  def parentTag = column[Int]("parent_tag") // ignore foreignKey
  def childTag = column[Int]("child_tag")
  foreignKey("foreign_key_parent_tag", parentTag, TableQuery[Tag])(_.tagId)
  foreignKey("foreign_key_child_tag", childTag, TableQuery[Tag])(_.tagId)
  def * = (parentTag, childTag)
}

class Studio(tag: T) extends Table[(Int, String)](tag, "studio") {
  def studioId = column[Int]("studio_id", O.PrimaryKey, O.AutoInc)
  def name = column[String]("name")
  def * = (studioId, name)
}

class Clip(tag: T) extends Table[(Int, String, Int, Race.Race, Blob, Int, Role, Int, Int)](tag, "clip") {
  def clipId = column[Int]("clip_id", O.PrimaryKey, O.AutoInc)
  def file = column[String]("file")
  def studioId = column[Int]("studio_id")
  def race = column[Race.Race]("race")(Race.mct)
  def thumb = column[Blob]("thumb")
  def grade = column[Int]("grade")
  def role = column[Role]("role")(Role.mct)
  def size = column[Int]("size")
  def length = column[Int]("length")
  index("index_file", file, unique = true)
  foreignKey("foreign_key_studio_id", studioId, TableQuery[Studio])(_.studioId)
  def * = (clipId, file, studioId, race, thumb, grade, role, size, length)
}

class ClipTag(tag: T) extends Table[(Int, Int)](tag, "clip_tag") {
  def clipId = column[Int]("clip_id")
  def tagId = column[Int]("tag_id")
  primaryKey("primary_key", (clipId, tagId))
  foreignKey("foreign_key_clip_id", clipId, TableQuery[Clip])(_.clipId)
  foreignKey("foreign_key_tag_id", tagId, TableQuery[Tag])(_.tagId)
  def * = (clipId, tagId)
}

class ExcludeFile(tag: T) extends Table[(String)](tag, "exclude_file") {
  def file = column[String]("file", O.PrimaryKey)
  def * = (file)
}

class Record(tag: T) extends Table[(Int, Int)](tag, "record") {
  def timestamp = column[Int]("timestamp")
  def clipId = column[Int]("clip_id")
  foreignKey("foreign_key_clip_id", clipId, TableQuery[Clip])(_.clipId)
  def * = (timestamp, clipId)
}

object Tables {
  val tag = TableQuery[Tag]
  val tagRelationship = TableQuery[TagRelationship]
  val studio = TableQuery[Studio]
  val clip = TableQuery[Clip]
  val clipTag = TableQuery[ClipTag]
  val excludeFile = TableQuery[ExcludeFile]
  val record = TableQuery[Record]
}