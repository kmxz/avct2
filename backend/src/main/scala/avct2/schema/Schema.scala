package avct2.schema

import java.sql.Blob

import scala.slick.driver.HsqldbDriver.simple._
import scala.slick.lifted.{TableQuery, Tag => T}

class Tags(tag: T) extends Table[(Option[Int], String)](tag, "tag") {
  def tagId = column[Int]("tag_id", O.PrimaryKey, O.AutoInc)
  def name = column[String]("name") // meta tag no longer needed. yet there will be auto-insert when selecting tags
  index("index_name", name, unique = true)
  def * = (tagId.?, name)
}

// Studio

class Studios(tag: T) extends Table[(Option[Int], String)](tag, "studio") {
  def studioId = column[Int]("studio_id", O.PrimaryKey, O.AutoInc)
  def name = column[String]("name")
  index("index_name", name, unique = true)
  def * = (studioId.?, name)
}

class Clip(tag: T) extends Table[(Option[Int], String, Option[Int], Race.Value, Option[Blob], Int, Role.ValueSet, Int, Int, String)](tag, "clip") {
  def clipId = column[Int]("clip_id", O.PrimaryKey, O.AutoInc)
  def file = column[String]("file")
  def studioId = column[Option[Int]]("studio_id")
  def race = column[Race.Value]("race")(Race.mct)
  def thumb = column[Option[Blob]]("thumb")
  def grade = column[Int]("grade")
  def role = column[Role.ValueSet]("role")(Role.mct)
  def size = column[Int]("size")
  def length = column[Int]("length")
  def sourceNote = column[String]("SOURCE_NOTES") // FIXME change it back to lowercase after debugging
  index("index_file", file, unique = true)
  foreignKey("foreign_key_studio_id", studioId, Tables.studio)(_.studioId)
  def * = (clipId.?, file, studioId, race, thumb, grade, role, size, length, sourceNote)
}


class ExcludeFile(tag: T) extends Table[(String)](tag, "exclude_file") {
  def file = column[String]("file", O.PrimaryKey)
  def * = file
}

class Record(tag: T) extends Table[(Int, Int)](tag, "record") {
  def timestamp = column[Int]("timestamp")
  def clipId = column[Int]("clip_id")
  foreignKey("foreign_key_clip_id", clipId, Tables.clip)(_.clipId)
  def * = (timestamp, clipId)
}

// interralation tables, no type class

class TagRelationship(tag: T) extends Table[(Int, Int)](tag, "tag_relationship") {
  def parentTag = column[Int]("parent_tag")
  def childTag = column[Int]("child_tag")
  primaryKey("primary_key", (parentTag, childTag))
  foreignKey("foreign_key_parent_tag", parentTag, Tables.tag)(_.tagId)
  foreignKey("foreign_key_child_tag", childTag, Tables.tag)(_.tagId)
  def * = (parentTag, childTag)
}

class ClipTag(tag: T) extends Table[(Int, Int)](tag, "clip_tag") {
  def clipId = column[Int]("clip_id")
  def tagId = column[Int]("tag_id")
  primaryKey("primary_key", (clipId, tagId))
  foreignKey("foreign_key_clip_id", clipId, Tables.clip)(_.clipId)
  foreignKey("foreign_key_tag_id", tagId, Tables.tag)(_.tagId)
  def * = (clipId, tagId)
}

object Tables {
  val tag = TableQuery[Tags]
  val tagRelationship = TableQuery[TagRelationship]
  val studio = TableQuery[Studios]
  val clip = TableQuery[Clip]
  val clipTag = TableQuery[ClipTag]
  val excludeFile = TableQuery[ExcludeFile]
  val record = TableQuery[Record]
}