package avct2.modules

import scala.slick.driver.HsqldbDriver.simple._
import avct2.schema.Tables

case class ClipTagCheck(clip: String, problematicTags: Seq[String])

object ClipTagCheck {

  // returns problematic parent tags
  def check(clipId: Int)(implicit session: Session): Seq[Int] = {
    val original = Tables.clipTag.filter(_.clipId === clipId).map(_.tagId).list
    val originalSet = original.toSet
    val tagIds = collection.mutable.Set(original: _*)
    val problematicIds = collection.mutable.Set[Int]()
    while (tagIds.nonEmpty) {
      val tagIdHead = tagIds.head
      Tables.tagRelationship.filter(_.childTag === tagIdHead).map(_.parentTag).list.foreach(parentTagId => tagIds.add(parentTagId))
      if (!originalSet.contains(tagIdHead)) {
        problematicIds.add(tagIdHead)
      }
      tagIds.remove(tagIdHead)
    }
    problematicIds.toSeq
  }

  def tagNames(resultOfCheck: Seq[Int])(implicit session: Session): Seq[String] = {
    resultOfCheck.map(tagId => {
      Tables.tag.filter(_.tagId === tagId).map(_.name).first
    })
  }

  def actualRun(clipId: Int, resultOfCheck: Seq[Int])(implicit session: Session) = {
    resultOfCheck.foreach(tagId => {
      Tables.clipTag.insert((clipId, tagId))
    })
  }

}