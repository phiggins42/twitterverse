#!/bin/bash

if [ -d dojo -a -d dojox/rpc -a -d dojox/analytics -a -d dojox/image -a -d dojox/fx -a -d plugd -a -d util -a -d dijit ]; then
	
	echo "Updating all required projects ... ";
	svn up dojo 
	svn up dijit
	svn up util/buildscripts
	svn up util/shrinksafe
	cd plugd && git pull origin master && cd ..
	# actually should do a for/in here
	svn up dojox/analytics

else
	
	echo "Checking out all required projects ... ";
	svn co http://svn.dojotoolkit.org/src/dojo/trunk ./dojo
	svn co http://svn.dojotoolkit.org/src/dijit/trunk ./dijit
	svn co http://svn.dojotoolkit.org/src/util/trunk/buildscripts ./util/buildscripts
	svn co http://svn.dojotoolkit.org/src/util/trunk/shrinksafe ./util/shrinksafe
	git clone git://github.com/phiggins42/plugd.git
	svn co http://svn.dojotoolkit.org/src/dojox/trunk/analytics ./dojox/analytics
	svn co http://svn.dojotoolkit.org/src/dojox/trunk/image ./dojox/image
	svn co http://svn.dojotoolkit.org/src/dojox/trunk/fx ./dojox/fx
	svn co http://svn.dojotoolkit.org/src/dojox/trunk/rpc ./dojox/rpc

fi

echo "Done."