package avct2.scalatra

import java.awt.image.BufferedImage
import java.io._
import javax.imageio.ImageIO

import avct2.Avct2Conf
import avct2.schema._
import org.json4s.DefaultFormats
import org.json4s.JsonAST.JNull
import org.scalatra.RenderPipeline
import org.scalatra.json.NativeJsonSupport

import scala.collection.mutable.Map
import scala.slick.driver.HsqldbDriver.simple._

trait JsonSupport extends NativeJsonSupport {
  protected implicit val jsonFormats = DefaultFormats

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

  // to be used with renderClip
  def queryClip(filter: TableQuery[Clip] => Query[Clip, _, Seq])(implicit session: Session) = {
    // actually I should fill the second type parameter of return type, instead of leaving _. but it's too long so I ignored that
    filter(Tables.clip).map(row => (row.clipId, row.file, row.studioId, row.race, row.grade, row.role, row.size, row.length, row.thumb.isNotNull, row.sourceNote, row.dimensions))
  }

  // to be used with queryClip
  def renderClip(tuple: (Int, String, Option[Int], Race.Value, Int, Role.ValueSet, Long, Int, Boolean, String, Dimensions))(implicit session: Session) = tuple match {
    case (clipId, file, studio, race, grade, role, size, length, thumbSet, sourceNote, dimensions) =>
      val tags = Tables.clipTag.filter(_.clipId === clipId).map(_.tagId).list
      val ts = Tables.record.filter(_.clipId === clipId).map(_.timestamp)
      val record = (ts.length, ts.max).shaped.run
      // caution: lastPlay may be void
      Map("id" -> clipId, "path" -> file, "studio" -> studio, "race" -> race.toString, "role" -> role.map(_.toString), "grade" -> grade, "size" -> size, "duration" -> length, "tags" -> tags, "totalPlay" -> record._1, "lastPlay" -> record._2, "thumbSet" -> thumbSet, "sourceNote" -> sourceNote, "resolution" -> dimensions.min) // Enum-s must be toString-ed, otherwise json4s will fuck things up
  }

  def openFile(id: Int, opener: (File => Boolean))(implicit session: Session) = {
    Tables.clip.filter(_.clipId === id).map(_.file).firstOption match {
      case Some(fileName) =>
        val f = new File(new File(Avct2Conf.getVideoDir), fileName)
        if (f.isFile) {
          if (opener(f)) None else Some((501, "System cannot open the file."))
        } else Some((503, "File does not exist."))
      case None => Some((404, "Clip does not exist."))
    }
  }

  def updateRaceAutomaticallyAccordingToStudio(clipId: Int, studioId: Int)(implicit session: Session) = {
    val otherClips = Tables.clip.filter(_.studioId === studioId).map(_.race).list
    if (otherClips.nonEmpty) {
      val map = Map[Race.Value, Int]()
      otherClips.foreach { race =>
        map.update(race, map.getOrElse(race, 0) + 1)
      }
      val length = otherClips.length
      map.maxBy(_._2) match {
        case (race, count) =>
          if (count * 2 > length) {
            Tables.clip.filter(_.clipId === clipId).map(_.race).update(race)
          }
      }
    }
  }

  def updateRolesAutomaticallyAccordingToStudio(clipId: Int, studioId: Int)(implicit session: Session) = {
    val otherClips = Tables.clip.filter(_.studioId === studioId).map(_.role).list
    if (otherClips.nonEmpty) {
      val map = Map[Role.Value, Int]()
      otherClips.foreach { roles =>
        roles.foreach(role => {
          map.update(role, map.getOrElse(role, 0) + 1)
        })
      }
      val length = otherClips.length
      val newRoles = Role.ValueSet(map.filter(_._2 * 2 > length).keys.toSeq: _*)
      Tables.clip.filter(_.clipId === clipId).map(_.role).update(newRoles)
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
