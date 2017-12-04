resolvers += Resolver.url("sbt-plugin-snapshots", new URL("http://scalasbt.artifactoryonline.com/scalasbt/sbt-plugin-snapshots/"))(Resolver.ivyStylePatterns)

addSbtPlugin("org.scalatra.sbt" % "sbt-scalatra" % "1.0.1")
