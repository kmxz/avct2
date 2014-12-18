package avct2.scalatra

import org.scalatra.ScalatraServlet

class NoCacheServlet extends ScalatraServlet {

  before() {
    response.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  }

}
