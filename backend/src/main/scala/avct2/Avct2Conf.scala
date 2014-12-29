package avct2

import java.io._
import java.util.Properties
import javax.swing.UIManager

import avct2.desktop.HintFrame
import avct2.schema.DbConnection

object Avct2Conf {

  final val configFileName = "avct2.properties"
  final val videoDirDbDirName = "Avct_v2"

  val properties = new Properties()

  var dbConnection: Option[DbConnection] = None

  def getMPlayer = properties.getProperty("mPlayer")

  def getVideoDir = properties.getProperty("videoDirectory")

  def getPlayers:Seq[String] = {
    properties.getProperty("videoPlayers") match {
      case text: String if (text.length > 0) => text.split(";")
      case _ => Seq[String]()
    }
  }

  def setMPlayer = properties.setProperty("mPlayer", _: String)

  def setVideoDir = properties.setProperty("videoDirectory", _: String)

  def setPlayers(players: Seq[String]) = properties.setProperty("videoPlayers", players.mkString(";"))

  def getVideoDirSubDir = new File(new File(getVideoDir), videoDirDbDirName)

  def validMPlayer(mPlayer: String) = {
    (mPlayer != null && new File(mPlayer).isFile)
  }

  def validVideoDir(videoDir: String) = {
    (videoDir != null && new File(videoDir).isDirectory)
  }

  def validPlayers(players: Seq[String]) = {
    players.map({ player =>
      new File(player).isFile
    }).fold(true)(_ && _)
  }

  def apply() = {
    UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName) // will fail under GTK
    if (initConfig()) {
      setUp()
    }
    HintFrame()
  }

  def initConfig() = {
    try {
      properties.load(new FileInputStream(configFileName))
      validVideoDir(getVideoDir) && validMPlayer(getMPlayer)
    } catch {
      case _: FileNotFoundException => false
    }
  }

  def save() = {
    // returns "need-to-refresh"
    properties.store(new FileOutputStream(configFileName), "Avct2 auto-generated config")
    setUp()
  }

  def setUp() = {
    if (dbConnection.isDefined) {
      dbConnection.get.close()
    }
    dbConnection = Some(new DbConnection(getVideoDirSubDir.getCanonicalPath + "/Avct_dbv2.db"))
  }

}
