package avct2.scalatra

import java.io.File

import avct2.Avct2Conf._
import avct2.desktop.FileBrowser
import org.scalatra.servlet.FileUploadSupport

class PreConfServlet extends NoCacheServlet with FileUploadSupport with JsonSupport {

  get("/current") {
    contentType = formats("json")
    Map("videoDir" -> getVideoDir, "mPlayer" -> getMPlayer, "players" -> getPlayers)
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
    val players = json[Seq[String]](params("players"))
    var legal = false
    if (validVideoDir(videoDir)) {
      setVideoDir(videoDir)
      legal = true
    }
    if (validMPlayer(mPlayer)) {
      setMPlayer(mPlayer)
    }
    if (validPlayers(players)) {
      setPlayers(players);
    }
    if (legal) {
      save()
      "REDIRECT"
    } else {
      "ILLEGAL"
    }
  }

}
