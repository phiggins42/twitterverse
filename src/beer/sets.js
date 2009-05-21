dojo.provide("beer.sets");
// module which handles the "sets" in a cookie

dojo.require("dojo.cookie");
dojo.require("plugd.base");

;(function(d){ 

	// a cache of our sets per page load, saved from cookie, etc
	var currentsets = {};

	d.mixin(beer.sets, {
		
		add: function(e){
			// summary: 
			//		Add the current 'view' as a set.
			
			e && e.preventDefault(); // safey first
			
			var state = beer._getSearches().map(function(w){
				// return a array of objects describing the
				// current 'state'
				return {
					q: w.query, a: w.auth ? 1 : 0
				}
			});

			// prompt the user for a name to save this 'state' as:
			var setname = state.length ? prompt("Name this set:") : false;

			// FIXME: make more robust. overwriting of states should be OK, etc.
			if(setname && !currentsets[setname]){
				// save the state as a set:
				currentsets[setname] = state;
				this._set(currentsets);
				this._addMenuItem(setname);
			}else{
				// tell someone maybe listening something went wrong.
				d.publish("/system/warning", ["Need to select a unique name for your set"]);
			}
		},

		_addMenuItem: function(setName){
			// summary:
			//		create two nodes and attach onclicks. one loads, one removed both nodes
			
			// create a menu item for loading a set:
			var n = dojo.place("<li><a href='#'>" + setName + "</a></li>", this.setsNode, "first");
			d.connect(n, "onclick", d.hitch(this, "_loadSet", setName));
			
			// create a menu item for clearing the set by name
			// FIXME: UX issue, set management should be easier.
			var rn = dojo.place(dojo.clone(n), this.clearSetsNode, "first");
			// passing both node references to _removeSet so it deletes them both,
			// but the UX is wrong. see `_removeSet`
			d.connect(rn, "onclick", d.hitch(this, "_removeSet", setName, [n, rn]));
		},

		_loadSet: function(byName, /* Event? */e){
			// "execute" a set. 
			e && e.preventDefault();
			var setdata = this._get()[byName];
			
			if(setdata){
				
				// make an array of the current queries on the page to compare against
				// our incoming intended set
				var setqueries = d.map(setdata, function(aset){
					return aset.q
				});
				
				// close the open searches that are not in this upcoming set
				var gone = beer._getSearches().filter(function(w){
					return d.indexOf(setqueries, w.query) < 0;
				}).forEach(function(w){
					// FIXME: WidgetSet array functions could support dojo's
					// fun version of .forEach("item._onclose()")
					w._onclose(); 
				});

				d.forEach(setdata, function(item){

					// dbl check we're not trying to make one left over 
					// from the ones we might have erased:
					if(!beer._getSearches().some(function(w){
						return w.query == item.q;
					})){
						// add it, based on auth flag in the set
						new beer[(item.a ? 
							"PublicStream" : "SearchTwitter"
						)]({
							query: item.q, maxId: item.id
						}).placeAt("ender","before");
					}
				});
			}
		},
		
		_removeSet: function(byName, nodes, e){
			// summary:
			//		Remove this set byName, deleting menu items
			//		and updating the sets cookies along the way.
			
			e && d.stopEvent(e);
			var setdata = this._get();
			if(setdata && setdata[byName]){
				delete setdata[byName];
				this._set(setdata);
				// FIXME: when we fix the UX of clear set menu, this should go away:
				d.forEach(nodes || [], d.destroy, d);
			}
		},
		
		// basic shorthand for tvsets cookie setting/getting. 
		_get: function(){
			return d.fromJson(d.cookie("tvsets"));
		},
		_set: function(setdata){
			console.log('setting', setdata);
			currentsets = setdata;
			return d.cookie("tvsets", d.toJson(setdata));
		},
		
		//>>excludeStart("debug", kwArgs.stripConsole);
		__reset: function(){
			// clear the cookies, remove in production
		},
		//>>excludeEnd("debug");
		
		init: function(){

			// use or create an unordered-list for our menu() for the sets
			this.setsNode = d.query("#setsMenu + ul")[0] 
				|| d.place("<ul></ul>", "setsMenu", "after")
			;
			
			// I don't like that i'm making a default UL here. but menu.js wants
			// it initially as it's not using dojo.behavior. same as above, use
			// or create an ul to clear the set
			this.clearSetsNode = d.query("#clearMenu + ul")[0] 
				|| d.place("<ul></ul>", "clearMenu", "after")
			;

			var info = this._get();
			if(info){
				currentsets = info;
				d.forIn(info, function(_, k){
					this._addMenuItem(k);
				}, this);
			}
		}
		
	});

})(dojo);