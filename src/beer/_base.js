//	The base `beer` namespace code. Do not include this directly, is part of `beer.layer`

dojo.provide("beer._base"); // alert the build to our presence

// load our plugins:
dojo.require("plugd.base"); // see beer.profile.js for how plugd is configured
dojo.require("plugd.trigger");
dojo.require("plugd.base"); // fun code
dojo.require("plugd.script"); // more fun

// load our module code
dojo.require("beer.Search"); // our SearchBoxThinger
dojo.require("beer.Config"); // our config singleton
dojo.require("beer.menu");
dojo.require("beer.sets");

dojo.mixin(beer, {
	
	// bootstrap code:
	init: function(){
		
		this.initMenu();
				
		// listen for key presses in the main listen, and focus on page load
		dojo.query("#q").onkeypress(this, "_inputListener").forEach(function(n){
			setTimeout(function(){ n.focus(); }, 75);
		});
				
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
	
	_inputListener: function(e){
		// summary: I'm probably attached to the main input on the page. 
		
		if(e.charOrCode == dojo.keys.ENTER){
			this._addSearches("q");
		}
	},
	
	_addSearches: function(/* String|DomNode */input){
		// break the input into comma seprated values, or one if lacking comma

		input = dojo.byId(input);
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
			// using plugd's .load so build doesn't see this
			dojo.load("dojox.analytics.Urchin", function(){
				new dojox.analytics.Urchin({
					acct:"UA-3572741-1",
					GAonLoad: function(){
						this.trackPageView("/demos/twitterverse");
					}
				});
			})
		}
	},
	
	initMenu: function(){
		// handle all the menu stuff. perhaps move into menu.js by itself
		
		this.trendNode = dojo.query("#trendingMenu + ul")
			.onclick(this, function(e){
				e.preventDefault();
				this._addQuery(e.target.innerHTML);
			})
		;
		
		// populate the trends menu
		this.loadTrends();

		// init the set manager:
		beer.sets.init();
		
		// setup the behavior for the menu:
		dojo.query("#menu").menu();
		
		// wire up known clicks, grab trends
		// wireup up the 'mark all read' link
		dojo.query("#markall").onclick(function(e){
			e.preventDefault();
			beer._getSearches().forEach(function(w){
				// tell each widget in this list to update themselves.
				w._markRead();
			});
		});

		// wire up the 'save set' link. execute beer.sets.add() in beer.sets context
		dojo.query("#saveset").onclick(beer.sets, "add");
		
	},
	
	loadTrends: function(){
		// summary: load the trends for the menu
		
		dojo.addScript(
			"http://search.twitter.com/trends/current.json?callback=?", 
			dojo.hitch(this, function(response){
				// clear the ul of items
				this.trendNode.empty();
				// ugh: twitter returns the trends as an object with non-zulu times
				// as keys. but only one in our case, forin that bitch.
				for(var i in response.trends){
					// yay, our one object is an array:
					dojo.forEach(response.trends[i], function(trend){
						// make a li for this trend, the click for him is delegated:
						dojo.place("<li><a href='#' rel='" + trend.query + "'>" + trend.name + "</a></li>", this.trendNode[0]);
					}, this);
				}
				
			})
		);		
	}

});

// start the whole thing
dojo.addOnLoad(beer, "init");