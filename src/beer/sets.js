dojo.provide("beer.sets");
// module which handles the "sets" in a cookie

dojo.require("dojo.cookie");

(function(d){ 

	var sets = {};

	d.mixin(beer.sets, {
		
		add: function(e){
			// summary: // only in dojo trunk, this is all false otherwise add the current selected view as a cookie
			e && e.preventDefault(); // safey first
			var state = beer._getSearches().map(function(w){
				return {
					q: w.query, a: w.auth ? 1 : 0
				}
			});

			var setname = state.length ? prompt("Name this set:") : false;

			if(setname && !sets[setname]){
				sets[setname] = state;
				d.cookie("tvsets", dojo.toJson(sets));
				this._addMenuItem(setname);
			}else{
				d.publish("/system/warning", ["Need to select a unique name for your set"]);
			}
		},

		_addMenuItem: function(setName){
			var n = dojo.place("<li><a href='#'>" + setName + "</a></li>", this.setsNode, "first");
			d.connect(n, "onclick", d.hitch(this, "_loadSet", setName));
			
			var rn = dojo.place(dojo.clone(n), this.clearSetsNode, "first");
			d.connect(rn, "onclick", d.hitch(this, "_removeSet", setName, [n, rn]));
		},

		_loadSet: function(byName, /* Event? */e){
			// "execute" a set. 
			e && e.preventDefault();
			var setdata = this._get()[byName];
			
			if(setdata){
				
				var setqueries = d.map(setdata, function(aset){
					return aset.q
				});
				
				// close the open searches that are not in this upcoming set
				var gone = beer._getSearches().filter(function(w){
					return d.indexOf(setqueries, w.query) < 0;
				}).forEach(function(w){ 
					w._onclose(); 
				});

				d.forEach(setdata, function(item){

					// dbl check we're not trying to make one left over 
					// from the ones we might have erased:
					if(!beer._getSearches().some(function(w){
						return w.query == item.q;
					})){
						// add it, base on auth
						new beer[(item.a ? 
							"PublicTimeline" : "SearchTwitter"
						)]({
							query: item.q, maxId: item.id
						}).placeAt("ender","before");
					}
				});
			}
		},
		
		_removeSet: function(byName, nodes, e){
			e && d.stopEvent(e);
			var setdata = this._get();
			if(setdata && setdata[byName]){
				delete setdata[byName];
				this._set(setdata);
				d.forEach(nodes || [], d.destroy, d);
			}
		},
		
		// basic shorthand for tvsets cookie
		_get: function(){
			return d.fromJson(d.cookie("tvsets"));
		},
		_set: function(setdata){
			sets = setdata;
			return d.cookie("tvsets", d.toJson(sets));
		},
		
		//>>excludeStart("debug", kwArgs.stripConsole);
		__reset: function(){
			// clear the cookies, remove in production
		},
		//>>excludeEnd("debug");
		
		init: function(){

			this.setsNode = d.query("#setsMenu + ul")[0] 
				|| d.place("<ul></ul>", "setsMenu", "after")
			;
			
			// I don't like that i'm making a default UL here. but menu.js wants
			// it initially as it's not using dojo.behavior
			this.clearSetsNode = d.query("#clearMenu + ul")[0] 
				|| d.place("<ul></ul>", "clearMenu", "after")
			;

			var info = sets = this._get();
			if(info){
				// console.log("present:", info);
				for(var i in info){
					this._addMenuItem(i);
				}
			}
		}
	});

})(dojo);