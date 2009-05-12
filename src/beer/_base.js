//	The base `beer` namespace code. Do not include this directly, is part of `beer.layer`

dojo.provide("beer._base"); // alert the build to our presence
dojo.require("plugd.base"); // fun code
dojo.require("plugd.script");
dojo.require("beer.Search");

dojo.mixin(beer, {
	
	init: function(){
		
		var input = dojo.byId("q");
		dojo.connect(input, "onkeypress", function(e){
			if(e.charOrCode == dojo.keys.ENTER){
				var l = dojo.indexOf(input.value, ",") >= 0 ? input.value.split(",") : [input.value];

				dojo.forEach(l, function(term){
					var exists = dijit.registry.filter(function(w){
						return w.query == term;
					}).length;

					if(!exists){
						new beer.SearchTwitter({ query: term }).placeAt("content");
					}
				});
				
				input.value = "";
			}
		})
	}
	
});

dojo.addOnLoad(beer, "init");
