package avct2.schema

import org.hsqldb.jdbc.JDBCPool
import slick.dbio.DBIOAction
import slick.jdbc.HsqldbProfile.api._

class DbConnection(file: String) {

  val id = java.util.UUID.randomUUID.toString

  val dataSource = new JDBCPool()
  dataSource.setDatabase("jdbc:hsqldb:file:" + file + ";shutdown=true;hsqldb.write_delay=false;default_schema=true")

  val database = Database.forDataSource(dataSource, Option(4))
  val schema = Tables.clip.schema ++ Tables.clipTag.schema ++ Tables.record.schema ++ Tables.tag.schema ++ Tables.tagRelationship.schema
  database.run(DBIO.seq(schema.createIfNotExists))

  def close() = {
    dataSource.close(0)
  }

}
