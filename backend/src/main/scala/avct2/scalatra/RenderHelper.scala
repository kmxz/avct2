package avct2.scalatra

import java.awt.image.BufferedImage
import java.io._

import javax.imageio.ImageIO

import scala.async.Async.{async, await}
import scala.concurrent.ExecutionContext.Implicits.global
import avct2.Avct2Conf
import avct2.schema._
import avct2.schema.MctImplicits._
import org.json4s.DefaultFormats
import org.json4s.JsonAST.JNull
import org.scalatra.RenderPipeline
import org.scalatra.json.NativeJsonSupport
import slick.jdbc.HsqldbProfile.api._

import scala.concurrent.Future

trait JsonSupport extends NativeJsonSupport {
  protected implicit lazy val jsonFormats = DefaultFormats

  def renderJNull: RenderPipeline = {
    case JNull => writeJson(JNull, response.writer)
  }

  override def renderPipeline = renderJNull orElse super.renderPipeline

  // get json fields with this
  def json[T](json: String)(implicit mf: scala.reflect.Manifest[T]): T = {
    parse(json).extract[T]
  }
}

trait RenderHelper {

  // for performance debugging
  def timeFuture[T](label: String, future: Future[T]): Future[T] = {
    val start = System.currentTimeMillis()
    future.onComplete({
      case _ => println(s"Future ${label} took ${System.currentTimeMillis() - start} ms")
    })
    future
  }

  // to be used with renderClip
  def queryClip(filter: TableQuery[Clip] => Query[Clip, _, Seq])(implicit db: Database) =
    // actually I should fill the second type parameter of return type, instead of leaving _. but it's too long so I ignored that
    db.run(filter(Tables.clip).map(row => (row.clipId, row.file, row.race, row.grade, row.role, row.size, row.length, row.thumb.isDefined, row.sourceNote, row.dimensions)).result)

  def queryRecords(baseQuery: Query[Record, _, Seq])(implicit db: Database): Future[Map[Int, (Int, Int)]] =
    db.run(baseQuery
      .groupBy(_.clipId)
      .map { case (clipId, group) => (clipId, group.map(_.timestamp).length, group.map(_.timestamp).max) }
      .result).map(list => list.map(row => (row._1, (row._2, row._3.getOrElse(0)))).toMap)

  // to be used with queryClip; latter two params for performance improvement only
  def renderClip(tuple: (Int, String, Race.Value, Int, Role.ValueSet, Long, Int, Boolean, String, Dimensions), tagTypesOptional: Option[Map[Int, TagType.Value]], clipTagsOptional: Option[Map[Int, Seq[Int]]], recordsOptional: Option[Map[Int, (Int, Int)]])(implicit db: Database) = async { tuple match {
    case (clipId, file, race, grade, role, size, length, thumbSet, sourceNote, dimensions) =>
      val allTags = await(clipTagsOptional.map(_.getOrElse(clipId, Seq.empty)).map(Future.successful).getOrElse(db.run(Tables.clipTag.filter(_.clipId === clipId).map(_.tagId).result)))
      val tagTypesFuture = tagTypesOptional.map(Future.successful).getOrElse(db.run(Tables.tag.filter(_.tagId.inSet(allTags)).map(tag => (tag.tagId, tag.tagType)).result).map(_.toMap))
      val record = await(recordsOptional.map(Future.successful).getOrElse(queryRecords(Tables.record.filter(_.clipId === clipId)))).getOrElse(clipId, (0, 0))
      val tagTypes = await(tagTypesFuture)
      // caution: lastPlay may be void
      Seq(
        /* "id" -> */ clipId,
        /* "path" -> */ file,
        /* "race" -> */ race.toString,
        /* "role" -> */ role.map(_.toString),
        /* "grade" -> */ grade,
        /* "size" -> */ size,
        /* "duration" -> */ length,
        /* "tags" -> */ allTags,
        /* "totalPlay" -> */ record._1,
        /* "lastPlay" -> */ record._2,
        /* "thumbSet" -> */ thumbSet,
        /* "sourceNote" -> */ sourceNote,
        /* "resolution" -> */ dimensions.min
      ) // Enum-s must be toString-ed, otherwise json4s will fuck things up
  }}

  def openFile(id: Int, opener: (File => Boolean))(implicit db: Database) = async {
    await(db.run(Tables.clip.filter(_.clipId === id).map(_.file).result.headOption)) match {
      case Some(fileName) =>
        val f = new File(new File(Avct2Conf.getVideoDir), fileName)
        if (f.isFile) {
          if (opener(f)) None else Some((501, "System cannot open the file."))
        } else Some((503, "File does not exist."))
      case None => Some((404, "Clip does not exist."))
    }
  }

  def updateRaceAutomaticallyAccordingToStudio(clipId: Int, studioTagIds: Set[Int])(implicit db: Database) = async {
    if (studioTagIds.isEmpty) () else {
      val otherClips = await(db.run(Tables.clip.filter(clip => clip.clipId in Tables.clipTag.filter(_.tagId inSet studioTagIds).map(_.clipId)).map(_.race).result))
      if (otherClips.nonEmpty) {
        val map = scala.collection.mutable.Map[Race.Value, Int]()
        otherClips.foreach { race =>
          map.update(race, map.getOrElse(race, 0) + 1)
        }
        val length = otherClips.length
        map.maxBy(_._2) match {
          case (race, count) =>
            if (count * 4 > length * 3) {
              await(db.run(Tables.clip.filter(_.clipId === clipId).map(_.race).update(race)))
            }
        }
      }
    }
  }

  def updateRolesAutomaticallyAccordingToStudio(clipId: Int, studioTagIds: Set[Int])(implicit db: Database) = async {
    if (studioTagIds.isEmpty) () else {
      val otherClips = await(db.run(Tables.clip.filter(clip => clip.clipId in Tables.clipTag.filter(_.tagId inSet studioTagIds).map(_.clipId)).map(_.role).result))
      if (otherClips.nonEmpty) {
        val map = scala.collection.mutable.Map[Role.Value, Int]()
        otherClips.foreach { roles =>
          roles.foreach(role => {
            map.update(role, map.getOrElse(role, 0) + 1)
          })
        }
        val length = otherClips.length
        val newRoles = Role.ValueSet(map.filter(_._2 * 4 > length * 3).keys.toSeq: _*)
        await(db.run(Tables.clip.filter(_.clipId === clipId).map(_.role).update(newRoles)))
      }
    }
  }

  def toJpeg(original: InputStream): Array[Byte] = {
    val image: BufferedImage = ImageIO.read(original)
    val convertedImage: BufferedImage = new BufferedImage(image.getWidth, image.getHeight, BufferedImage.TYPE_INT_RGB)
    convertedImage.createGraphics.drawRenderedImage(image, null)
    val baos: ByteArrayOutputStream = new ByteArrayOutputStream
    ImageIO.write(convertedImage, "jpeg", baos)
    baos.toByteArray
  }

}
