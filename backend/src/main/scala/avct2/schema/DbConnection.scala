package avct2.schema

import org.hsqldb.jdbc.JDBCPool

import scala.slick.driver.HsqldbDriver
import scala.slick.driver.HsqldbDriver.simple._
import scala.slick.jdbc.meta.MTable

class DbConnection(file: String) {

  val id = java.util.UUID.randomUUID.toString

  val dataSource = new JDBCPool()
  dataSource.setDatabase("jdbc:hsqldb:file:" + file + ";shutdown=true;hsqldb.write_delay=false;default_schema=true")

  val database: HsqldbDriver.backend.DatabaseDef = Database.forDataSource(dataSource)

  database.withSession { implicit session =>
    val ddl = Tables.tag.ddl ++ Tables.tagRelationship.ddl ++ Tables.studio.ddl ++ Tables.clip.ddl ++ Tables.clipTag.ddl ++ Tables.record.ddl
    if (MTable.getTables.list.isEmpty) {
      ddl.create
    }
  }

  def close() = {
    dataSource.close(0)
  }

}
