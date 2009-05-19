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
dojo.require("beer.menu");

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
	
	addSet: function(e){
		// summary: // only in dojo trunk, this is all false otherwise add the current selected view as a cookie
		e && e.preventDefault(); // safey first
		var state = this._getSearches().map(function(w){
			return {
				q: w.query, a: w.auth, id: w.maxId
			}
		});
		console.log('should set cookie for:', state);
		var setname = state.length ? prompt("Name this set:") : false;
		var sets = [];

		if(setname && dojo.indexOf(sets, setname) >= 0){
		}else{
			dojo.publish("/system/warning", ["Need to select a unique name for your set"]);
		}
	},
	
	loadSet: function(byName){
		// hmmmmmmm
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
			new dojox.analytics.Urchin({
				acct:"UA-3572741-1",
				GAonLoad: function(){
					this.trackPageView("/demos/twitterverse");
				}
			});
		}
	},
	
	initMenu: function(){
		// handle all the menu stuff. perhaps move into menu.js by itself
		
		this.trendNode = dojo.query(dojo.create("ul"))
			.place("#trendingMenu", "after")
			.onclick(this, function(e){
				e.preventDefault();
				this._addQuery(e.target.innerHTML);
			})
		;
		
		this.loadTrends();
		
		// setup the behavior
		dojo.query("#menu").menu();
		
		// wire up known clicks, grab trends
		// wireup up the 'mark all read' link

		dojo.query("#markall").onclick(this, function(e){
			e.preventDefault();
			this._getSearches().forEach(function(w){
				// yay plugd, no need to dig up which function is reacting to
				// onclick, just trigger a fake event from the widget node
				// FIXME: should move to w.markAsRead() or similar
				dojo.trigger(w.domNode, "onclick");
			});
		});

		// wire up the 'save set' link
		dojo.query("#saveset").onclick(this, "addSet");
				
	},
	
	_cbCount: 0,
	getJsonp: function(url, callback){
		// extension to plugd's addScript to replace callback=? with a generated 
		// callback member, and delete it. 
		
		var id = "_cbk" + (beer._cbCount++);
		beer[id] = callback;

		url = url.replace(/callback=\?/, "callback=beer." + id + "");
		
		dojo.addScript(url, function(){
			delete beer[id];
		});
		
	},
	
	loadTrends: function(){
		// summary: load the trends for the menu
		
		this.getJsonp(
			"http://search.twitter.com/trends/current.json?callback=?", 
			dojo.hitch(this, function(response){
				this.trendNode.empty();
				for(var i in response.trends){
					dojo.forEach(response.trends[i], function(trend){
						dojo.place("<li><a href='#' rel='" + trend.query + "'>" + trend.name + "</a></li>", this.trendNode[0]);
					}, this);
				}
				
			})
		);
		
	},
	
	// hack: experimental moveable
	
});

// start the whole thing
dojo.addOnLoad(beer, "init");