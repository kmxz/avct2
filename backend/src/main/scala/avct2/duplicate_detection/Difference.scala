package avct2.duplicate_detection

import avct2.duplicate_detection.Difference.ClipRow
import avct2.schema.{Tables, Race, Role, Clip}

import scala.collection.immutable.Set
import scala.math._
import scala.slick.driver.HsqldbDriver.simple._
import scala.slick.lifted.TableQuery

case class EntryResult(name: String, rawScore: Double)

case class Report(clipId: Int, entries: Seq[EntryResult], total: Double)

abstract class AbstractEntry {

  val name: String

  val weight: Double

  def getScore(clipOld: ClipRow, clipNew: ClipRow): Double

  def getResult(clipOld: ClipRow, clipNew: ClipRow) = {
    val score = getScore(clipOld, clipNew)
    (EntryResult(name, score), weight * score)
  }

}

object NameEntry extends AbstractEntry {

  final val name = "Filename"

  final val weight = 1.0

  def getScore(clipOld: ClipRow, clipNew: ClipRow) = {
    Levenshtein(clipOld._1, clipNew._1)
  }

}

object StudioEntry extends AbstractEntry {

  final val name = "Studio"

  final val weight = 1.0

  def getScore(clipOld: ClipRow, clipNew: ClipRow) = {
    if (clipOld._2 == clipNew._2) 1 else 0
  }

}

object RaceEntry extends AbstractEntry {

  final val name = "Race"

  final val weight = 0.25

  def getScore(clipOld: ClipRow, clipNew: ClipRow) = {
    if (clipOld._3 == clipNew._3) 1 else 0
  }

}

object RoleEntry extends AbstractEntry {

  final val name = "Role"

  final val weight = 0.25

  def getScore(clipOld: ClipRow, clipNew: ClipRow) = {
    CosineSimilarity(clipOld._4, clipNew._4)
  }

}

object SizeEntry extends AbstractEntry {

  final val name = "Size"

  final val weight = 0.5

  def getScore(clipOld: ClipRow, clipNew: ClipRow) = {
    if (clipOld._5 > 0 && clipNew._5 > 0) {
      exp((2 - (clipNew._5.toDouble / clipOld._5) - (clipOld._5.toDouble / clipNew._5)) * 1000)
    } else 0
  }

}

object LengthEntry extends AbstractEntry {

  final val name = "Length"

  final val weight = 0.75

  def getScore(clipOld: ClipRow, clipNew: ClipRow) = {
    if (clipOld._5 > 0 && clipNew._5 > 0) {
      val diff = abs(clipNew._6 - clipOld._6).toDouble
      exp(-diff / E) * 0.75 + exp(-diff / 30) * 0.25
    } else 0
  }

}

object TagsEntry extends AbstractEntry {

  final val name = "Tags"

  final val weight = 1.5

  def getScore(clipOld: ClipRow, clipNew: ClipRow) = {
    CosineSimilarity(clipOld._8, clipNew._8)
  }

}

object Difference {

  val entries = Seq(NameEntry, StudioEntry, RaceEntry, RoleEntry, SizeEntry, LengthEntry, TagsEntry)

  // filename, studioId, race, role, size, length, clipId, tags
  type ClipRow = (String, Option[Int], Race.Value, Role.ValueSet, Long, Int, Int, Set[Int])

  private def getClipRows(clips: Query[Clip, _, Seq])(implicit session: Session) = {
    clips.map(row => (row.file, row.studioId, row.race, row.role, row.size, row.length, row.clipId)).list.map(row =>
      (row._1, row._2, row._3, row._4, row._5, row._6, row._7, Tables.clipTag.filter(_.clipId === row._7).map(_.tagId).list.toSet)
    )
  }

  def scanAll(clipId: Int)(implicit session: Session) = {
    val target = getClipRows(Tables.clip.filter(_.clipId === clipId)).head
    getClipRows(Tables.clip.filter(_.clipId =!= clipId)).map({row =>
      val acquiredResults = entries.map(entry => entry.getResult(target, row))
      Report(row._7, acquiredResults.map(_._1), acquiredResults.map(_._2).reduce(_ + _))
    }).sortBy(_.total)
  }

}

object CosineSimilarity {

  def apply[T](s1: Set[T], s2: Set[T]) = {
    if (s1.isEmpty || s2.isEmpty) {
      0.toDouble
    } else {
      s1.intersect(s2).size / sqrt(s1.size * s2.size)
    }
  }

}

object Levenshtein {

  private def minimum(i1: Int, i2: Int, i3: Int) = min(min(i1, i2), i3)

  private def distance(s1: String, s2: String) = {
    val dist = Array.tabulate(s2.length + 1, s1.length + 1) { (j, i)=>
      if (j == 0) i else if (i == 0) j else 0 }

    for(j <- 1 to s2.length; i <- 1 to s1.length)
      dist(j)(i) = if (s2(j - 1) == s1(i - 1)) dist(j - 1)(i - 1) else minimum(dist(j - 1)(i) + 1, dist(j)(i - 1) + 1, dist(j - 1)(i - 1) + 1)

    dist(s2.length)(s1.length)
  }

  def apply(s1: String, s2: String) = 1 - distance(s1, s2) / max(s1.length, s2.length)

}
