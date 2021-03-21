package avct2.modules

import avct2.modules.Difference.ClipRow
import avct2.schema.{Clip, Race, Role, Tables, TagType}
import avct2.schema.MctImplicits._

import scala.collection.immutable.Set
import scala.math._
import slick.jdbc.HsqldbProfile.api._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.async.Async.{async, await}
import scala.concurrent.Future

case class Report(clipId: Int, scores: Map[String, Double], total: Double)

abstract class AbstractEntry {

  val name: String

  val weight: Double

  def getScore(clipOld: ClipRow, clipNew: ClipRow): Double

  def getResult(clipOld: ClipRow, clipNew: ClipRow) = {
    val score = getScore(clipOld, clipNew)
    ((name, score), weight * score)
  }

}

object NameEntry extends AbstractEntry {

  final val name = "Filename"

  final val weight = 1.0

  def getScore(clipOld: ClipRow, clipNew: ClipRow) = {
    Levenshtein(clipOld.filename, clipNew.filename)
  }

}

object StudioEntry extends AbstractEntry {

  final val name = "Studio"

  final val weight = 1.0

  def getScore(clipOld: ClipRow, clipNew: ClipRow) = {
    CosineSimilarity(clipOld.studioId, clipNew.studioId)
  }

}

object RaceEntry extends AbstractEntry {

  final val name = "Race"

  final val weight = 0.25

  def getScore(clipOld: ClipRow, clipNew: ClipRow) = {
    if (clipOld.race == clipNew.race) 1 else 0
  }

}

object RoleEntry extends AbstractEntry {

  final val name = "Role"

  final val weight = 0.5

  def getScore(clipOld: ClipRow, clipNew: ClipRow) = {
    CosineSimilarity(clipOld.role, clipNew.role)
  }

}

object SizeEntry extends AbstractEntry {

  final val name = "Size"

  final val weight = 2.5

  def getScore(clipOld: ClipRow, clipNew: ClipRow) = {
    if (clipOld.size > 0 && clipNew.size > 0) {
      exp((2 - (clipNew.size.toDouble / clipOld.size) - (clipOld.size.toDouble / clipNew.size)) * 1000000)
    } else 0
  }

}

object LengthEntry extends AbstractEntry {

  final val name = "Length"

  final val weight = 0.75

  def getScore(clipOld: ClipRow, clipNew: ClipRow) = {
    if (clipOld.length > 0 && clipNew.length > 0) {
      val diff = abs(clipNew.length - clipOld.length).toDouble
      exp(-diff)
    } else 0
  }

}

object TagsEntry extends AbstractEntry {

  final val name = "Tags"

  final val weight = 1.5

  def getScore(clipOld: ClipRow, clipNew: ClipRow) = {
    CosineSimilarity(clipOld.contentTags, clipNew.contentTags)
  }

}

object Difference {

  val entries = Seq(NameEntry, StudioEntry, RaceEntry, RoleEntry, SizeEntry, LengthEntry, TagsEntry)

  case class ClipRow(filename: String, studioId: Set[Int], race: Race.Value, role: Role.ValueSet, size: Long, length: Int, clipId: Int, contentTags: Set[Int])

  private def getClipRows(clips: Query[Clip, _, Seq], tagTypes: Map[Int, TagType.Value])(implicit db: Database): Future[Seq[ClipRow]] =
    db.run(clips.map(row => (row.file, row.race, row.role, row.size, row.length, row.clipId)).result)
      .flatMap(clips => Future.sequence(clips.map(row =>
        db.run(Tables.clipTag.filter(_.clipId === row._6).map(_.tagId).result).map(allTags =>
          ClipRow(row._1, allTags.filter(tag => tagTypes(tag) == TagType.studio).toSet, row._2, row._3, row._4, row._5, row._6, allTags.filter(tag => tagTypes(tag) == TagType.content).toSet)
        )
      )))

  def scanAll(clipId: Int)(implicit db: Database): Future[Seq[Report]] = async {
    val allTags = await(db.run(Tables.tag.map(tag => (tag.tagId, tag.tagType)).result)).toMap
    val target = await(getClipRows(Tables.clip.filter(_.clipId === clipId), allTags)).head
    await(getClipRows(Tables.clip.filter(_.clipId =!= clipId), allTags)).map({row =>
      val acquiredResults = entries.map(entry => entry.getResult(target, row))
      Report(row.clipId, acquiredResults.map(_._1).toMap, acquiredResults.map(_._2).sum)
    }).sortBy(-_.total).take(25)
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
      if (j == 0) i else if (i == 0) j else 0
    }

    for (j <- 1 to s2.length; i <- 1 to s1.length) {
      dist(j)(i) = if (s2(j - 1) == s1(i - 1)) dist(j - 1)(i - 1) else minimum(dist(j - 1)(i) + 1, dist(j)(i - 1) + 1, dist(j - 1)(i - 1) + 1)
    }

    dist(s2.length)(s1.length)
  }

  def apply(s1: String, s2: String) = 1 - distance(s1, s2).toDouble / max(s1.length, s2.length)

}
