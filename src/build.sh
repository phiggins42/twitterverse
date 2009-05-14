#/bin/sh

./getdojo.sh
cd util/buildscripts/
./build.sh profileFile=../../beer.profile.js

echo "Don't forget to adjust the path to dojo.js in ../index.html for production";