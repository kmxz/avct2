package avct2.desktop

import java.io.File

import avct.IdentifyVideo
import avct2.Avct2Conf
import avct2.schema.Tables

import scala.slick.driver.HsqldbDriver.simple._

/**
 * Created by kmxz on 12/20/14.
 */
object Autocrawl {

  def recursiveListFiles(f: File): Array[File] = {
    if (f.getName == Avct2Conf.videoDirDbDirName) {
      Array.empty[File]
    }
    val these = f.listFiles
    these.filter(_.isFile) ++ these.filter(_.isDirectory).flatMap(recursiveListFiles)
  }

  def relativePath(base: File, path: File) = {
    base.toURI().relativize(path.toURI()).getPath()
  }

  def fileExistInDir(path: String)(implicit session: Session) = {
    Tables.clip.filter(_.file === path).exists.run
  }

  def getNewFiles(implicit session: Session) = {
    val videoDir = new File(Avct2Conf.getVideoDir)
    recursiveListFiles(videoDir).map(file => (file, relativePath(videoDir, file))).filter(tuple => !fileExistInDir(tuple._2)).filter(_._1.length > 65535) // a size of 64 KB is required
  }

  def addTo(f: (File, String))(implicit session: Session) = f match {
    case (file, path) =>
      val duration = IdentifyVideo.getDuration(file, Avct2Conf.getMPlayer)
      Tables.clip.map(row => (row.file, row.size, row.length)).insert((path, file.length, duration))
  }

  def apply = {
    Avct2Conf.dbConnection.get.database.withSession(implicit session =>
      getNewFiles.foreach(addTo)
    )
  }

}
