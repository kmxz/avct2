package avct2.scalatra

import java.io.File

import avct2.Avct2Conf
import avct2.Avct2Conf._
import avct2.desktop.FileBrowser
import org.json4s.DefaultFormats
import org.scalatra.ScalatraServlet
import org.scalatra.json.NativeJsonSupport
import org.scalatra.servlet.FileUploadSupport

class PreConfServlet extends ScalatraServlet with FileUploadSupport with NativeJsonSupport {

  protected implicit val jsonFormats = DefaultFormats

  get("/current") {
    contentType = formats("json")
    Map("videoDir" -> getVideoDir, "mPlayer" -> getMPlayer)
  }

  get("/list") {
    contentType = formats("json")
    try {
      FileBrowser.browse(new File(params("path")))
    } catch {
      case e: IllegalArgumentException => {
        Map("error" -> e.getMessage())
      }
    }
  }

  post("/update") {
    val videoDir = params("videoDir")
    val mPlayer = params("mPlayer")
    var legal = false
    if (validVideoDir(videoDir)) {
      setVideoDir(videoDir)
      legal = true
    }
    if (validMPlayer(mPlayer)) {
      setMPlayer(mPlayer)
    }
    if (legal) {
      save()
      "REDIRECT"
    } else {
      "ILLEGAL"
    }
  }

}
