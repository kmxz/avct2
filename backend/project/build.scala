import com.bowlingx.sbt.plugins.Wro4jPlugin.Wro4jKeys._
import com.bowlingx.sbt.plugins.Wro4jPlugin._
import com.earldouglas.xsbtwebplugin.PluginKeys._
import com.earldouglas.xsbtwebplugin.WebPlugin._
import org.scalatra.sbt._
import sbt.Keys._
import sbt._

object Avct2Build extends Build {

  lazy val project = Project(
    "avct2",
    file("."),
    settings = ScalatraPlugin.scalatraSettings ++ wro4jSettings ++ Seq(
      organization := "kmxz",
      name := "avct2",
      version := "0.1.0",
      scalaVersion := "2.10.4",
      resolvers += Classpaths.typesafeReleases,
      port in container.Configuration := 1024,

      // let container include the wro4j target folder
      (webappResources in Compile) <+= (targetFolder in generateResources in Compile),

      libraryDependencies ++= Seq(
        // gui
        "org.scala-lang" % "scala-swing" % "2.10.4",
        // scalatra
        "org.scalatra" %% "scalatra" % "2.3.0",
        // json
        "org.scalatra" %% "scalatra-json" % "2.3.0",
        "org.json4s" %% "json4s-native" % "3.2.10",
        // servlet container
        "org.eclipse.jetty" % "jetty-webapp" % "9.1.3.v20140225" % "container",
        "org.eclipse.jetty" % "jetty-plus" % "9.1.3.v20140225" % "container",
        "org.eclipse.jetty.orbit" % "javax.servlet" % "3.0.0.v201112011016" % "container;provided" artifacts (Artifact("javax.servlet", "jar", "jar")),
        // database
        "com.typesafe.slick" %% "slick" % "2.1.0",
        "org.hsqldb" % "hsqldb" % "2.3.2"
      )
    )
  )

}
