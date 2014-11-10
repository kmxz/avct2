import javax.servlet.ServletContext

import avct2.desktop.Avct2
import avct2.scalatra.Avct2Servlet
import avct2.schema.Tables
import org.scalatra._

import scala.slick.driver.HsqldbDriver.simple._
import scala.slick.jdbc.meta.MTable
import org.hsqldb.jdbc.JDBCPool

class ScalatraBootstrap extends LifeCycle {

  override def init(context: ServletContext) {
    Avct2.loadMain()
    val dataSource = new JDBCPool()
    dataSource.setDatabase("jdbc:hsqldb:file:" + Avct2.properties.getProperty("videoDirectory") + "/Avct_v2/Avct_dbv2.db;shutdown=true;hsqldb.write_delay=false;default_schema=true")
    val database = Database.forDataSource(dataSource)
    database.withSession { implicit session =>
      val ddl = Tables.tag.ddl ++ Tables.tagRelationship.ddl ++ Tables.studio.ddl ++ Tables.clip.ddl ++ Tables.clipTag.ddl ++ Tables.excludeFile.ddl ++ Tables.record.ddl
      if (MTable.getTables.list.isEmpty) {
        ddl.create
      }
    }
    context.mount(new Avct2Servlet(database), "/*")
  }

}
