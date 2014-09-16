import javax.servlet.ServletContext
import org.scalatra._
import scala.slick.driver.SQLiteDriver.simple._
import scala.slick.jdbc.meta.MTable

import avct2.desktop.Avct2
import avct2.scalatra.Avct2Servlet
import avct2.schema.Tables

class ScalatraBootstrap extends LifeCycle {

  override def init(context: ServletContext) {
    val database = Database.forURL("jdbc:sqlite:Avct_dbv2.db", driver = "org.sqlite.JDBC")
    database.withSession {
      implicit session =>
      if (MTable.getTables.list.isEmpty) {
        val ddl = Tables.tag.ddl ++ Tables.tagRelationship.ddl ++ Tables.studio.ddl ++ Tables.clip.ddl ++ Tables.clipTag.ddl ++ Tables.excludeFile.ddl ++ Tables.record.ddl
        ddl.create
      }
    }
    Avct2.loadMain()
    context.mount(new Avct2Servlet(database), "/*")
  }

}
