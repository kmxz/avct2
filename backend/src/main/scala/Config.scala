package avct2

import java.io.File
import java.util.Properties
import javax.swing.border.EmptyBorder
import javax.swing.WindowConstants
import scala.swing.GridBagPanel._
import scala.swing.FileChooser._
import scala.swing._


object Config {

  def apply (properties: Properties) = {
    new Config(properties)
    valid(properties, false)
  }

  def valid (properties: Properties, full: Boolean) = {
    new File(properties.getProperty("videoDirectory")).isDirectory && (!full || new File(properties.getProperty("mPlayer")).isFile)
  }

}

class Config (properties: Properties) {

  lazy val ui = new GridBagPanel {
    val videoDirectoryTextField = new TextField(properties.getProperty("videoDirectory", ""))
    val mPlayerTextField = new TextField(properties.getProperty("mPlayer", ""))

    {
      val defaultInsets = new Insets(5, 5, 5, 5)
      border = new EmptyBorder(5, 5, 5, 5)

      def location(x: Int, y: Int, span: Option[Int] = None) = new Constraints {
        fill = Fill.Horizontal
        gridx = x
        gridy = y
        insets = defaultInsets
        if (!span.isEmpty) {
          gridwidth = span.get
        }
      }

      layout(new Label("Video directory")) = location(0, 0)

      layout(videoDirectoryTextField) = location(1, 0)

      layout(Button("Select") {
        val fileChooser = new FileChooser {
          multiSelectionEnabled = false
          fileSelectionMode = SelectionMode.DirectoriesOnly
        }
        if (fileChooser.showOpenDialog(videoDirectoryTextField) == Result.Approve) {
          videoDirectoryTextField.text = fileChooser.selectedFile.getCanonicalPath
        }
      }) = location(2, 0)

      layout(new Label("MPlayer executable")) = location(0, 1)

      layout(mPlayerTextField) = location(1, 1)

      layout(Button("Select") {
        val fileChooser = new FileChooser {
          multiSelectionEnabled = false
          fileSelectionMode = SelectionMode.FilesOnly
        }
        if (fileChooser.showOpenDialog(mPlayerTextField) == Result.Approve) {
          mPlayerTextField.text = fileChooser.selectedFile.getCanonicalPath
        }
      }) = location(2, 1)

      layout(new Label("The configuration will be saved as avct2.properties")) = location(0, 2, Some(2))

      layout(Button("OK") {
        properties.setProperty("videoDirectory", videoDirectoryTextField.text)
        properties.setProperty("mPlayer", mPlayerTextField.text)
        dialog.close()
      }) = location(2, 2)
    }
  }

  val dialog: Dialog = new Dialog {
    title = "Configuration"
    contents = ui
    resizable = false
    modal = true
    peer.setDefaultCloseOperation(WindowConstants.DISPOSE_ON_CLOSE)
  }

  dialog.pack()
  dialog.centerOnScreen()
  dialog.visible = true

}