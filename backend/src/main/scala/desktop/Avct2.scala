package scalatra

import java.io._
import java.util.Properties
import javax.swing.{WindowConstants, UIManager}

import scala.swing.Dialog.Message
import scala.swing.{Label, Dialog}


object Avct2 {

  final val configFileName = "avct2.properties"
  val properties = new Properties()

  def initConfig() = {
    try {
      properties.load(new FileInputStream(configFileName))
      Config.valid(properties, true)
    } catch {
      case _: FileNotFoundException => false
    }
  }

  def loadMain() = {
    UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName) // may fail under GTK
    if (!initConfig()) {
      if (!Config(properties)) {
        panic("No valid video directory specified.")
      }
      properties.store(new FileOutputStream(configFileName), "Avct2 auto-generated config")
    }
    HintFrame()
  }

  def panic(info: String) = {
    Dialog.showMessage(message = info, title = "Fatal error", messageType = Message.Error)
    sys.exit(1)
  }

}
