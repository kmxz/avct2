package avct2.desktop

import java.awt.Desktop
import java.io.{File, IOException}

import scala.sys.process._

object OpenFile {

  private def awtOpen (file: File): Boolean = {
    try {
      Desktop.getDesktop.open(file)
      true
    } catch {
      case _: UnsupportedOperationException | _: IOException => false
    }
  }

  private def switch (windows: File => Boolean, linux: File => Boolean, mac: File => Boolean, default: File => Boolean): File => Boolean = {
    if (os.startsWith("Windows")) {
      windows
    } else if (os.startsWith("Linux")) {
      linux
    } else if (os.startsWith("Mac OS X")) {
      mac // though never actually needed
    } else {
      default
    }
  }

  lazy val open = switch(file => {
    Seq("explorer", file.getCanonicalPath).! == 0
  }, file => {
    Seq("xdg-open", file.getCanonicalPath).! == 0
  }, file => {
    Seq("open", file.getCanonicalPath).! == 0
  }, file => {
    awtOpen(file.getParentFile)
  })

  lazy val openInFolder = switch(file => {
    Seq("explorer", "/select,", file.getCanonicalPath).! == 0
  }, file => { // XXX: maybe use DBus approach instead?
    if (nautilusInstalled) {
      Seq("nautilus", file.getCanonicalPath).! == 0
    } else if (dolphinInstalled) {
      Seq("dolphin", "--select", file.getCanonicalPath).! == 0
    } else {
      Seq("xdg-open", file.getParent).! == 0
    }
  }, file => {
    Seq("open", "-R", file.getCanonicalPath).! == 0
  }, file => {
    awtOpen(file.getParentFile)
  })

  val openWith = (file: File, player: File) => {
    Seq(player.getCanonicalPath, file.getCanonicalPath).! == 0
  }

  private lazy val os: String = System.getProperty("os.name")

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