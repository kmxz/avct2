import java.text.SimpleDateFormat
import java.util.Calendar

organization := "kmxz"
name := "avct2"
version := new SimpleDateFormat("yyyyMMdd").format(Calendar.getInstance().getTime())
scalaVersion := "2.12.12"
scalacOptions += "-target:jvm-1.8"
scalacOptions += "-Xasync"
javacOptions ++= Seq("-source", "1.8", "-target", "1.8")
resolvers ++= Seq(
  Classpaths.typesafeReleases,
  "myGrid Repository" at "http://www.mygrid.org.uk/maven/repository"
)

libraryDependencies ++= Seq(
  // scalatra
  "org.scalatra" %% "scalatra" % "2.6.5",
  // json
  "org.scalatra" %% "scalatra-json" % "2.6.5",
  "org.json4s" %% "json4s-native" % "3.5.3",
  // servlet container
  "org.eclipse.jetty" % "jetty-plus" % "9.4.8.v20171121" % "container",
  "javax.servlet" % "javax.servlet-api" % "3.1.0" % "provided",
  // database
  "com.typesafe.slick" %% "slick" % "3.3.3",
  "org.hsqldb" % "hsqldb" % "2.5.1",
  // jai image conversion
  "com.github.jai-imageio" % "jai-imageio-core" % "1.3.1",
  // async
  "org.scala-lang.modules" %% "scala-async" % "1.0.0-M1",
  "org.scala-lang" % "scala-reflect" % scalaVersion.value % Provided
)

enablePlugins(ScalatraPlugin)
