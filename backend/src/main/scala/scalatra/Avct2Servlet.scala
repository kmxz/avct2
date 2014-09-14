package avct2.scalatra

import org.scalatra._

import scala.slick.driver.SQLiteDriver.simple.Database


class Avct2Servlet(db: Database) extends ScalatraServlet {

  get("/") {
    <html>
      <body>
        <h1>Hello, world!</h1>
        Say <a href="hello-scalate">hello to Scalate</a>.
      </body>
    </html>
  }
  
}
