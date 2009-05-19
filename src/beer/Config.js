dojo.provide("beer.Config"); // the Config box

dojo.require("dijit._Widget");

dojo.declare("beer.Config", dijit._Widget, {
		
});

dojo.addOnLoad(function(){
	// it is just a singleton really
	new beer.Config({}, "config");
})