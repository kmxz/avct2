package avct2.desktop

import java.io._
import java.util.Properties
import javax.swing.UIManager
import scala.swing.Dialog
import scala.swing.Dialog.Message


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
