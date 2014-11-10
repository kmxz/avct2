package avct2.desktop

import java.io.File
import java.awt.Desktop
import sys.process._

object OpenFile {

  val openInFolder = (file: File) => {
    val os: String = System.getProperty("os.name")
    if (os.startsWith("Windows")) {
      Seq("explorer", "/select,", file.getCanonicalPath).!
    } else if (os.startsWith("Linux")) {
      if (nautilusInstalled) {
        Seq("nautilus", file.getCanonicalPath).!
      } else {
        Seq("xdg-open", file.getParent).!
      }
    } else if (os.startsWith("Mac OS X")) { // though never actually needed
      Seq("open", "-R", file.getCanonicalPath).!
    } else { // awt default
      Desktop.getDesktop().open(file.getParentFile)
    }
  }

  val open = (file: File) => {
    Desktop.getDesktop().open(file)
  }

  private lazy val nautilusInstalled = {
     Seq("nautilus", "--version").! == 0
  }
  
}