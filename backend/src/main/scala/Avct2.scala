package avct2

import java.io.{IOException, File, FileNotFoundException, FileInputStream}
import java.util.Properties
import javax.swing.{WindowConstants, UIManager}

import scala.swing.Dialog.Message
import scala.swing.{Label, Dialog}


object Avct2 {

  val properties = new Properties()

  def initConfig() = {
    properties.load(new FileInputStream("avct2.properties")) // may throw FileNotFoundException
    if (Config.valid(properties, true)) {
      throw new FileNotFoundException
    }
  }

  def configWindow() = {

  }

  def main(args: Array[String]) = {
    UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName)
    try {
      initConfig()
    } catch {
      case _: IOException => if (!Config(properties)) { panic("No valid video directory specified.") }
    }
    println("Life's hard")
  }

  def panic(info: String) = {
    Dialog.showMessage(message = info, title = "Fatal error", messageType = Message.Error)
    sys.exit(1)
  }

}
