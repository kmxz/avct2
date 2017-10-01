package avct2.schema

import java.sql.Blob

import scala.slick.driver.HsqldbDriver.simple._
import scala.slick.lifted.{TableQuery, Tag => T}

class Tags(tag: T) extends Table[(Option[Int], String, Option[String])](tag, "tag") {
  def tagId = column[Int]("tag_id", O.PrimaryKey, O.AutoInc)

  def name = column[String]("name")
  def description = column[Option[String]]("description")
  index("index_name", name, unique = true)

  def * = (tagId.?, name, description)
}

class Studios(tag: T) extends Table[(Option[Int], String)](tag, "studio") {
  def studioId = column[Int]("studio_id", O.PrimaryKey, O.AutoInc)

  def name = column[String]("name")

  index("index_name", name, unique = true)

  def * = (studioId.?, name)
}

class Clip(tag: T) extends Table[(Option[Int], String, Option[Int], Race.Value, Option[Blob], Int, Role.ValueSet, Long, Int, String, Dimensions)](tag, "clip") {
  def clipId = column[Int]("clip_id", O.PrimaryKey, O.AutoInc)

  def file = column[String]("file")

  def studioId = column[Option[Int]]("studio_id")

  def race = column[Race.Value]("race")(Race.mct)

  def thumb = column[Option[Blob]]("thumb")

  def grade = column[Int]("grade")

  def role = column[Role.ValueSet]("role")(Role.mct)

  def size = column[Long]("size")

  def length = column[Int]("length")

  def dimensions = column[Dimensions]("dimensions")(Dimensions.mct)

  def sourceNote = column[String]("source_note")

  index("index_file", file, unique = true)

  def * = (clipId.?, file, studioId, race, thumb, grade, role, size, length, sourceNote, dimensions)
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
  val record = TableQuery[Record]
}