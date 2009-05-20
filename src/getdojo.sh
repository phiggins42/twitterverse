#!/bin/bash

if [ -d dojo -a -d dojox/analytics -a -d plugd -a -d util -a -d dijit ]; then
	
	echo "Updating all required projects ... ";
	svn up dojo 
	svn up dijit
	svn up util/buildscripts
	svn up util/shrinksafe
	svn up plugd
	svn up dojox/analytics

else
	
	echo "Checking out all required projects ... ";
	svn co http://svn.dojotoolkit.org/src/dojo/trunk ./dojo
	svn co http://svn.dojotoolkit.org/src/dijit/trunk ./dijit
	svn co http://svn.dojotoolkit.org/src/util/trunk/buildscripts ./util/buildscripts
	svn co http://svn.dojotoolkit.org/src/util/trunk/shrinksafe ./util/shrinksafe
	svn co http://plugd.googlecode.com/svn/trunk/ ./plugd
	svn co http://svn.dojotoolkit.org/src/dojox/trunk/analytics ./dojox/analytics
	
fi

echo "Done."