Seems usable for production now. Tested under Linux-desktop, using Google Chrome or Mozilla Firefox as browsers.

The [original manager](http://code.google.com/p/avct) written in Java/SWT is too nasty. SWT UI is poor in both taste and compatibility. Coding with it is also hairy.

This version uses Web UI, with a backend on the same machine.

Run `init.sh` to download some third-party dependencies and build scripts.

Then run `./sbt` in `backend` directory to build. For building and running, http://scalatra.org/2.6/guides/deployment/servlet-container.html will be helpful.

To run the packaged `.war` file, [Jetty Runner](https://webtide.com/jetty-runner/) is recommended.
