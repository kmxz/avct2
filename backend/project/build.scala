import sbt._
import Keys._
import org.scalatra.sbt._
import com.earldouglas.xsbtwebplugin.PluginKeys._
import com.earldouglas.xsbtwebplugin.WebPlugin._

object Avct2Build extends Build {

  lazy val project = Project (
    "avct2",
    file("."),
    settings = ScalatraPlugin.scalatraSettings ++ Seq(
      organization := "kmxz",
      name := "avct2",
      version := "0.1.0",
      scalaVersion := "2.10.4",
      resolvers += Classpaths.typesafeReleases,
      port in container.Configuration := 1024,
      libraryDependencies ++= Seq(
        "org.scala-lang" % "scala-swing" % "2.10.4",
        "org.scalatra" %% "scalatra" % "2.3.0",
        "org.eclipse.jetty" % "jetty-webapp" % "9.1.3.v20140225" % "container",
        "org.eclipse.jetty" % "jetty-plus" % "9.1.3.v20140225" % "container",
        "org.eclipse.jetty.orbit" % "javax.servlet" % "3.0.0.v201112011016" % "container;provided" artifacts (Artifact("javax.servlet", "jar", "jar")),
        "com.typesafe.slick" %% "slick" % "2.1.0",
        "org.xerial" % "sqlite-jdbc" % "3.7.2"
      )
    )
  )

}
