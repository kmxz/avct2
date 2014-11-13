package avct2

import java.io._
import java.util.Properties
import javax.swing.UIManager

import avct2.desktop.HintFrame
import avct2.schema.DbConnection

object Avct2Conf {

  final val configFileName = "avct2.properties"

  val properties = new Properties()

  var dbConnection: Option[DbConnection] = None

  def getMPlayer = properties.getProperty("mPlayer")

  def getVideoDir = properties.getProperty("videoDirectory")

  def setMPlayer = properties.setProperty("mPlayer", _: String)

  def setVideoDir = properties.setProperty("videoDirectory", _: String)

  def validMPlayer(mPlayer: String) = {
    (mPlayer != null && new File(mPlayer).isFile)
  }

  def validVideoDir(videoDir: String) = {
    (videoDir != null && new File(videoDir).isDirectory)
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
    dbConnection = Some(new DbConnection(getVideoDir + "/Avct_v2/Avct_dbv2.db"))
  }

}
