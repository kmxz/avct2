import javax.servlet.ServletContext
import avct2.Avct2Conf
import avct2.scalatra.{Avct2Servlet, NoCacheServlet, PreConfServlet, StaticFileServlet}
import org.scalatra._

import java.nio.file.Paths

class ScalatraBootstrap extends LifeCycle {

  override def init(context: ServletContext) {
    context.mount(new NoCacheServlet {
      get("/") {
        Avct2Conf.dbConnection match {
          case None => redirect("/conf")
          case Some(conn) =>
            redirect("/webui?" + conn.id)
        }
      }
    }, "/")
    context.mount(new PreConfServlet(), "/conf/*")
    context.mount(new Avct2Servlet(), "/serv/*")
    context.mount(new StaticFileServlet(Paths.get(System.getProperty("user.dir"), "ui")), "/ui/*")
    Avct2Conf()
  }

}
