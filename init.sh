mkdir -p frontend/bootstrap/theme
mkdir -p frontend/bootstrap/fonts
wget http://bootswatch.com/paper/bootstrap.css -O frontend/bootstrap/theme/bootstrap.css
wget http://bootswatch.com/fonts/glyphicons-halflings-regular.ttf -O frontend/bootstrap/fonts/glyphicons-halflings-regular.ttf
wget http://bootswatch.com/fonts/glyphicons-halflings-regular.woff -O frontend/bootstrap/fonts/glyphicons-halflings-regular.woff
wget https://raw.githubusercontent.com/paulp/sbt-extras/master/sbt -O backend/sbt
