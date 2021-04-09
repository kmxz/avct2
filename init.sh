mkdir -p backend/src/main/webapp/bootstrap/theme
mkdir -p backend/src/main/webapp/bootstrap/fonts
wget http://bootswatch.com/paper/bootstrap.css -O backend/src/main/webapp/bootstrap/theme/bootstrap.css
wget http://bootswatch.com/fonts/glyphicons-halflings-regular.ttf -O backend/src/main/webapp/bootstrap/fonts/glyphicons-halflings-regular.ttf
wget http://bootswatch.com/fonts/glyphicons-halflings-regular.woff -O backend/src/main/webapp/bootstrap/fonts/glyphicons-halflings-regular.woff
wget https://raw.githubusercontent.com/paulp/sbt-extras/master/sbt -O backend/sbt
cd newui
npm install
npm run build
