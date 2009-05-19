//	The base `beer` namespace code. Do not include this directly, is part of `beer.layer`

dojo.provide("beer._base"); // alert the build to our presence

// load our plugins:
dojo.require("dojo.cookie");
dojo.require("plugd.trigger");
dojo.require("plugd.base"); // fun code
dojo.require("plugd.script"); // more fun
dojo.require("dojox.analytics.Urchin");

// load our module code
dojo.require("beer.Search"); // our SearchBoxThinger
dojo.require("beer.Config"); // our config singleton

dojo.mixin(beer, {
	
	// bootstrap code:
	init: function(){
		
		// listen for key presses in the main listen, and focus on page load
		dojo.query("#q").onkeypress(this, "_inputListener").forEach(function(n){
			setTimeout(function(){ n.focus(); }, 75);
		});
		
		// wireup up the 'mark all read' link
		dojo.query("#markall").onclick(this, function(e){
			e.preventDefault();
			this._getSearches().forEach(function(w){
				// yay plugd, no need to dig up which function is reacting to
				// onclick, just trigger a fake event from the widget node
				dojo.trigger(w.domNode, "onclick");
			});
		});

		// wire up the 'save set' link
		dojo.query("#saveset").onclick(this, "addSet");
		
		// listen for the search boxes telling us there are new items
		dojo.subscribe("/new/tweets", this, "setTitle");
		
		// setup google-analytics for this demo (but only on dtk.org)
		this.checkGA();
		
	},
	
	_getSearches: function(){
		// summary: a quick way to get all search boxes, because we've done it more than once
		return dijit.registry.filter(function(w){
			return w.declaredClass == "beer.SearchTwitter" 
				|| w.declaredClass == "beer.PublicStream"
		});
	},
	
	addSet: function(e){
		// summary: // only in dojo trunk, this is all false otherwise add the current selected view as a cookie
		e && e.preventDefault(); // safey first
		var state = this._getSearches().map(function(w){
			return {
				q: w.query, a: w.auth, id: w.maxId
			}
		});
		console.log('should set cookie for:', state);
	},
	
	loadSet: function(byName){
		// hmmmmmmm
	},
	
	_inputListener: function(e){
		// summary: I'm probably attached to the main input on the page. 
		
		var input = dojo.byId("q");
		if(e.charOrCode == dojo.keys.ENTER){
			this._addSearches(input);
		}
	},
	
	_addSearches: function(input){
		// break the input into comma seprated values, or one if lacking comma
		var l = dojo.indexOf(input.value, ",") >= 0 
			? input.value.split(",") : [input.value];

		// add each of the found terms as a search box or appropriate
		dojo.forEach(l, this._addQuery, this);
		
		// reset the value
		input.value = "";
	},
	
	_addQuery: function(term){
		// avoid null queryies
		if(!dojo.trim(term).length){ return };
		
		// fix "foo or bar" or "foo OR bar", the API doesn't seem 
		// to like it (search.twitter.com is fine tho)
		term = term.replace(/\ or\ /g, " OR ");
		
		// make sure we don't have any of these terms in play already:
		var exists = dijit.registry.some(function(w){
			// `some` only in dojo trunk
			return w.query == term;
		}); 

		if(!exists){
			// put all other special formatter selections here:
			var re = /public:(\w+)/;
			if(re.test(term)){
				// add a public timeline for a username:
				new beer.PublicStream({ 
					query: term.match(re)[1], // only the name part
					auth: true // indicate this is a public: url
				}).placeAt("ender", "before");
			}else{
				// add a new beer Search instance
				new beer.SearchTwitter({ query: term }).placeAt("ender", "before");
			}
		}
	},
	
	setTitle: function(){
		// summary: Update the heading and title based on the number of 
		//		unseen tweets availables
		
		var sum = 0;
		// find all instances, and cumulatively increment the total
		beer._getSearches().forEach(function(w){
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
		if(/dojotoolkit/.test(window.location.href)){
			new dojox.analytics.Urchin({
				acct:"UA-3572741-1",
				GAonLoad: function(){
					this.trackPageView("/demos/twitterverse");
				}
			});
		}
	}
	
	// hack: experimental moveable
	
});

// start the whole thing
dojo.addOnLoad(beer, "init");