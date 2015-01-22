import java.text.SimpleDateFormat
import java.util.Calendar

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
      version := new SimpleDateFormat("yyyyMMdd").format(Calendar.getInstance().getTime()),
      scalaVersion := "2.10.4",
      javacOptions ++= Seq("-source", "1.7", "-target", "1.7"), // force using Java 7 instead of 8 as https://github.com/jai-imageio/jai-imageio-core/issues/6
      resolvers ++= Seq(
        Classpaths.typesafeReleases,
        "myGrid Repository" at "http://www.mygrid.org.uk/maven/repository"
      ),

      // let container include the wro4j target folder
      (webappResources in Compile) <+= (targetFolder in generateResources in Compile),

      libraryDependencies ++= Seq(
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
        "org.hsqldb" % "hsqldb" % "2.3.2",
        // disable logging
        "org.slf4j" % "slf4j-nop" % "1.7.7",
        // jai image conversion
        "net.java.dev.jai-imageio" % "jai-imageio-core-standalone" % "1.2-pre-dr-b04-2014-09-13"
      )
    )
  )

}