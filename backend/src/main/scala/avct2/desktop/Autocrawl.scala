package avct2.desktop

import java.io.File

import avct.IdentifyVideo
import avct2.Avct2Conf
import avct2.schema.{Race, Role, Tables, Utilities}

import scala.slick.driver.HsqldbDriver.simple._

object Autocrawl {

  private final val excludeFileTypes = Set[String]("", "jpg", "jpeg", "doc", "docx", "odt", "bmp", "html", "html", "mht", "lnk", "torrent", "csv", "mp3", "url", "wma", "pdf", "png", "gif", "txt", "rar", "tar", "zip", "gz", "bz2", "7z", "tgz")

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
    !excludeFileTypes.contains(getFileExtension(f))
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

  private def fileExistInDbAndMark(path: String)(implicit session: Session) = {
    val clipRow = Tables.clip.filter(_.file === path)
    if (clipRow.exists.run) {
      clipRow.map(_.fileExists).update(true)
      true
    } else false
  }

  private def getNewFilesAndMark(implicit session: Session) = {
    val videoDir = new File(Avct2Conf.getVideoDir)
    recursiveListFiles(videoDir).map(file => (file, relativePath(videoDir, file))).filter(tuple => !fileExistInDbAndMark(tuple._2)).filter(_._1.length > 65535) // a size of 64 KB is required
  }

  private def addTo(f: (File, String))(implicit session: Session) = f match {
    case (file, path) =>
      val duration = IdentifyVideo.getDuration(file, Avct2Conf.getMPlayer)
      Tables.clip.map(row => (row.file, row.size, row.length, row.race, row.grade, row.role, row.sourceNote, row.fileExists)).insert((path, file.length, duration, Race.unknown, 0, Role.ValueSet.empty, "", true))
  }

  def apply(implicit session: Session): Seq[String] = this.synchronized {
    Utilities.orphanStudioCleanup
    Utilities.orphanTagCleanup
    Tables.clip.map(_.fileExists).update(false)
    val newFiles = getNewFilesAndMark
    newFiles.foreach(addTo)
    newFiles.map(_._2)
  }
}
