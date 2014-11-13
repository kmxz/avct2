package avct2.desktop

import java.io.File

object FileBrowser {

  case class PathInfo(name: String, path: String)

  case class FileInfo(name: String, path: String, directory: Boolean)

  private def pathSplit(path: File, buffer: List[PathInfo] = List[PathInfo]()): List[PathInfo] = {
    if (path == null) {
      buffer
    } else {
      pathSplit(path.getParentFile, buffer.+:(PathInfo(path.getName, path.getCanonicalPath)))
    }
  }

  def browse(path: File) = {
    val file = path.getCanonicalFile
    if (!path.isDirectory) {
      throw new IllegalArgumentException("Specified argument is not a directory!")
    }
    Map("path" -> pathSplit(file), "files" -> file.listFiles.map(file => {
      if (file.isDirectory) {
        Some(FileInfo(file.getName, file.getCanonicalPath, true))
      }
      else if (file.isFile) {
        Some(FileInfo(file.getName, file.getCanonicalPath, false))
      }
      else {
        None
      }
    }))
  }

}
