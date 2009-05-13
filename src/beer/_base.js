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
					// avoid null queryies
					if(!term.length){ return };
					
					// fix "foo or bar" or "foo OR bar", the API doesn't seem to like it (search.twitter.com is fine tho)
					term = term.replace(/\ or\ /g, "OR");
					
					// make sure we don't have any of these terms in play already:
					var exists = dijit.registry.filter(function(w){
						return w.query == term;
					}).length;

					if(!exists){
						// add a new beer instance
						new beer.SearchTwitter({ query: term }).placeAt("ender", "before");
					}
				});
				
				// reset the value
				input.value = "";
			}
		});
		
		dojo.subscribe("/new/tweets", this, "setTitle");
	},
	
	setTitle: function(){
		
		var sum = 0;
		dijit.registry.byClass("beer.SearchTwitter").forEach(function(w){
			var t = w.newCount.innerHTML;
			var n = t.match(/\d+/);
			n = n ? +n[0] : 0;
			sum += n;
		});

		dojo.doc.title = (sum ? "["+ sum + "]" : "") + " twitterverse()";
		dojo.byId("newCount").innerHTML = sum;

	}
	
});

dojo.addOnLoad(beer, "init");
