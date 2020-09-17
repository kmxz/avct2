package avct2.schema

import java.sql.Blob

import slick.jdbc.HsqldbProfile.api._
import slick.lifted.{TableQuery, Tag => T}

class Tags(tag: T) extends Table[(Option[Int], String, Option[String], Option[Int], TagType.Value)](tag, "tag") {
  import MctImplicits._

  def tagId = column[Int]("tag_id", O.PrimaryKey, O.AutoInc)

  def name = column[String]("name")
  def description = column[Option[String]]("description")
  def bestOfTag = column[Option[Int]]("best_of_tag")
  def tagType = column[TagType.Value]("type")
  index("index_name", name, unique = true)

  def * = (tagId.?, name, description, bestOfTag, tagType)
}

class Clip(tag: T) extends Table[(Option[Int], String, Race.Value, Option[Blob], Int, Role.ValueSet, Long, Int, String, Dimensions)](tag, "clip") {
  import MctImplicits._

  def clipId = column[Int]("clip_id", O.PrimaryKey, O.AutoInc)

  def file = column[String]("file")

  def race = column[Race.Value]("race")

  def thumb = column[Option[Blob]]("thumb")

  def grade = column[Int]("grade")

  def role = column[Role.ValueSet]("role")

  def size = column[Long]("size")

  def length = column[Int]("length")

  def sourceNote = column[String]("source_note")

  def dimensions = column[Dimensions]("dimensions")

  index("index_file", file, unique = true)

  def * = (clipId.?, file, race, thumb, grade, role, size, length, sourceNote, dimensions)
}

class Record(tag: T) extends Table[(Int, Int)](tag, "record") {
  def timestamp = column[Int]("timestamp")

  def clipId = column[Int]("clip_id")

  foreignKey("foreign_key_clip_id", clipId, Tables.clip)(_.clipId)

  def * = (timestamp, clipId)
}

// interrelation tables, no type class

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
  val clip = TableQuery[Clip]
  val clipTag = TableQuery[ClipTag]
  val record = TableQuery[Record]
}