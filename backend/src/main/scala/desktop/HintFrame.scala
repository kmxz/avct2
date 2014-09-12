package scalatra

import java.awt.Desktop
import java.net.URI
import javax.swing.border.EmptyBorder
import scala.swing._


object HintFrame {

  final val uri = "http://localhost:1024/gui"

  lazy val ui = new FlowPanel() {
    contents += Button("Open web UI") {
      Desktop.getDesktop.browse(new URI(uri))
    }
    contents += new Label(uri)
    contents += Button("Quit") {
      sys.exit(0)
    }
  }

  lazy val frame:MainFrame = new MainFrame() {
    title = "Avct2"
    contents = ui
    resizable = false
  }

  def apply() = {
    frame.pack()
    frame.centerOnScreen()
    frame.visible = true
  }

}
