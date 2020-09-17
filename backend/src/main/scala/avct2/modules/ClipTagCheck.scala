package avct2.modules

import avct2.schema.Tables
import slick.jdbc.HsqldbProfile.api._

import scala.async.Async.{async, await}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future

case class ClipTagCheck(clip: String, problematicTags: Seq[String])

object ClipTagCheck {

  // returns problematic parent tags
  def check(clipId: Int)(implicit db: Database): Future[Seq[Int]] = async {
    val original = await(db.run(Tables.clipTag.filter(_.clipId === clipId).map(_.tagId).result))
    val originalSet = original.toSet
    val tagIds = collection.mutable.Set(original: _*)
    val problematicIds = collection.mutable.Set[Int]()
    while (tagIds.nonEmpty) {
      val tagIdHead = tagIds.head
      await(db.run(Tables.tagRelationship.filter(_.childTag === tagIdHead).map(_.parentTag).result)).foreach(parentTagId => tagIds.add(parentTagId))
      if (!originalSet.contains(tagIdHead)) {
        problematicIds.add(tagIdHead)
      }
      tagIds.remove(tagIdHead)
    }
    problematicIds.toSeq
  }

  def tagNames(resultOfCheck: Seq[Int])(implicit db: Database): Future[Seq[String]] =
    db.run(Tables.tag.filter(_.tagId inSet resultOfCheck).map(_.name).result)

  def actualRun(clipId: Int, resultOfCheck: Seq[Int])(implicit db: Database) =
    db.run(Tables.clipTag ++= resultOfCheck.map(tagId => (clipId, tagId)))
}