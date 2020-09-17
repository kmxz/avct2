package avct2.desktop

import java.io.File

import avct.IdentifyVideo
import avct2.Avct2Conf
import avct2.schema.{Race, Role, Tables, Utilities, Dimensions}
import avct2.schema.MctImplicits._

import slick.jdbc.HsqldbProfile.api._
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global
import scala.async.Async.{async, await}

case class Changes(added: Iterable[String], disappeared: Iterable[String])

object Autocrawl {

  private final val excludeFileTypes = Set[String]("jpg", "jpeg", "doc", "docx", "odt", "bmp", "html", "html", "mht", "lnk", "torrent", "csv", "mp3", "url", "wma", "pdf", "png", "gif", "txt", "rar", "tar", "zip", "gz", "bz2", "7z", "tgz")

  private def getFileExtension(file: File) = {
    val name = file.getName
    val lastIndexOf = name.lastIndexOf(".")
    if (lastIndexOf == -1) {
      ""
    } else {
      name.substring(lastIndexOf + 1)
    }
  }

  private def notExcludedFile(f: File) = {
    !excludeFileTypes.contains(getFileExtension(f).toLowerCase)
  }

  private def recursiveListFiles(f: File): Array[File] = {
    if (f.getName == Avct2Conf.videoDirDbDirName) {
      Array.empty[File]
    } else {
      val these = f.listFiles
      these.filter(_.isFile).filter(notExcludedFile) ++ these.filter(_.isDirectory).flatMap(recursiveListFiles)
    }
  }

  private def relativePath(base: File, path: File) = {
    base.toURI.relativize(path.toURI).getPath
  }

  private def fileExistInDbAndMark(path: String, paths: scala.collection.mutable.Set[String]) = {
    paths.remove(path)
  }

  private def getNewFilesAndMark(paths: scala.collection.mutable.Set[String]) = {
    val videoDir = new File(Avct2Conf.getVideoDir)
    recursiveListFiles(videoDir).map(file => (file, relativePath(videoDir, file))).filter(tuple => !fileExistInDbAndMark(tuple._2, paths)).filter(_._1.length > 65535) // a size of 64 KB is required
  }

  private def addTo(f: (File, String)) = f match {
    case (file, path) =>
      val identifiedInfo = IdentifyVideo.identify(file, Avct2Conf.getMPlayer)
      Tables.clip.map(row => (row.file, row.size, row.length, row.race, row.grade, row.role, row.sourceNote, row.dimensions)) += (path, file.length, identifiedInfo.getDuration, Race.unknown, 0, Role.ValueSet.empty, "", Dimensions(identifiedInfo.getWidth, identifiedInfo.getHeight))
  }

  def apply(db: Database): Future[Changes] = this.synchronized (async {
    val paths = scala.collection.mutable.Set(await(db.run(Tables.clip.map(_.file).result)): _*)
    Utilities.orphanTagCleanup(db)
    val newFiles = getNewFilesAndMark(paths)
    await(db.run(DBIO.seq(newFiles.map(addTo): _*)))
    Changes(newFiles.map(_._2), paths)
  })

}
