//	The base `beer` namespace code. Do not include this directly, is part of `beer.layer`

dojo.provide("beer._base"); // alert the build to our presence
dojo.require("plugd.base"); // fun code
dojo.require("plugd.script"); // more fun
dojo.require("beer.Search"); // our SearchBoxThinger

dojo.mixin(beer, {
	
	// bootstrap code:
	init: function(){
		
		var input = dojo.byId("q");
		dojo.connect(input, "onkeypress", function(e){
			if(e.charOrCode == dojo.keys.ENTER){
				// break the input into comma seprated values, or one if lacking comma
				var l = dojo.indexOf(input.value, ",") >= 0 
					? input.value.split(",") : [input.value];

				dojo.forEach(l, function(term){
					// avoid null queryies
					if(!dojo.trim(term).length){ return };
					
					// fix "foo or bar" or "foo OR bar", the API doesn't seem 
					// to like it (search.twitter.com is fine tho)
					term = term.replace(/\ or\ /g, "OR");
					
					// make sure we don't have any of these terms in play already:
					var exists = dijit.registry.filter(function(w){
						return w.query == term;
					}).length; // only in dojo.trunk, this is all false otherwise

					if(!exists){
						// add a new beer instance
						new beer.SearchTwitter({ query: term }).placeAt("ender", "before");
					}
				});
				
				// reset the value
				input.value = "";
			}
			
			
		});
		
		// listen for the search boxes telling us there are new items
		dojo.subscribe("/new/tweets", this, "setTitle");
		
		// setup google-analytics for this demo (but only on dtk.org)
		this.checkGA();
		
	},
	
	setTitle: function(){
		// summary: Update the heading and title based on the number of 
		//		unseen tweets availables
		
		var sum = 0;
		// find all instances, and cumulatively increment the total
		dijit.registry.byClass("beer.SearchTwitter").forEach(function(w){
			var n = w.newCount.innerHTML.match(/\d+/); // get the value
			n = n ? +n[0] : 0; // make sure it exsits and is a value
			sum += n; // add it
		});

		// update the areas:
		dojo.doc.title = (sum ? "["+ sum + "]" : "") + " twitterverse()";
		dojo.byId("newCount").innerHTML = sum || "";

	},
	
	checkGA: function(){
		// summary: A function to track analytics if this is on dojotoolkit.org
		if(/dojotoolkit/.test(window.location.href) || true){
			dojo["require"]("dojox.analytics.Urchin");
			dojo.addOnLoad(function(){
				new dojox.analytics.Urchin({
					acct:"UA-3572741-1",
					GAonLoad: function(){
						this.trackPageView("/demos/twitterverse");
					}
				});
			});
		}
	}
	
});

// start the whole thing
dojo.addOnLoad(beer, "init");