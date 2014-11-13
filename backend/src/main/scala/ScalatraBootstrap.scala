import javax.servlet.ServletContext

import avct2.Avct2Conf
import avct2.scalatra.{Avct2Servlet, PreConfServlet}
import org.scalatra._
class ScalatraBootstrap extends LifeCycle {

  override def init(context: ServletContext) {
    context.mount(new ScalatraServlet {
      get("/") {
        Avct2Conf.dbConnection match {
          case None => redirect("/conf")
          case Some(conn) => {
            redirect("/webui?" + conn.id)
          }
        }
      }
    }, "/")
    context.mount(new PreConfServlet(), "/conf/*")
    context.mount(new Avct2Servlet(), "/webui/*")
    Avct2Conf()
  }

}
