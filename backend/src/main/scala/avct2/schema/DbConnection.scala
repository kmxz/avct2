package avct2.schema

import org.hsqldb.jdbc.JDBCPool
import slick.jdbc.HsqldbProfile.api._

class DbConnection(file: String) {

  val id = java.util.UUID.randomUUID.toString

  val dataSource = new JDBCPool()
  dataSource.setDatabase("jdbc:hsqldb:file:" + file + ";shutdown=true;hsqldb.write_delay=false;default_schema=true")

  val database = Database.forDataSource(dataSource, Option(4))

  def close() = {
    dataSource.close(0)
  }

}
