import scalatra._
import org.scalatra._
import javax.servlet.ServletContext
import scala.slick.jdbc.JdbcBackend.Database


class ScalatraBootstrap extends LifeCycle {

  override def init(context: ServletContext) {
    val database = Database.forURL("jdbc:sqlite:Avct_dbv2.db", driver = "org.sqlite.JDBC")
    Avct2.loadMain()
    context.mount(new Avct2Servlet(database), "/*")
  }

}
