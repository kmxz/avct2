package avct2.desktop

import java.awt.Desktop
import java.io.{File, IOException}

import scala.sys.process._

object OpenFile {

  val open = (file: File) => {
    try {
      Desktop.getDesktop.open(file)
      true
    } catch {
      case _: UnsupportedOperationException | _: IOException => false
    }
  }

  val openWith = (file: File, player: File) => {
    Seq(player.getCanonicalPath, file.getCanonicalPath).! == 0
  }

  val openInFolder = (file: File) => {
    val os: String = System.getProperty("os.name")
    if (os.startsWith("Windows")) {
      Seq("explorer", "/select,", file.getCanonicalPath).! == 0
    } else if (os.startsWith("Linux")) {
      // XXX: maybe use DBus approach instead?
      if (nautilusInstalled) {
        Seq("nautilus", file.getCanonicalPath).! == 0
      } else if (dolphinInstalled) {
        Seq("dolphin", "--select", file.getCanonicalPath).! == 0
      } else {
        Seq("xdg-open", file.getParent).! == 0
      }
    } else if (os.startsWith("Mac OS X")) {
      // though never actually needed
      Seq("open", "-R", file.getCanonicalPath).! == 0
    } else {
      // awt default
      open(file.getParentFile)
    }
  }

  private lazy val nautilusInstalled = {
    try {
      Seq("nautilus", "--version").! == 0
    } catch {
      case _: IOException => false
    }
  }

  private lazy val dolphinInstalled = {
    try {
      Seq("dolphin", "--version").! == 0
    } catch {
      case _: IOException => false
    }
  }

}