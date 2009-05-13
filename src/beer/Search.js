dojo.provide("beer.Search");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.fx");
dojo.require("dojo.NodeList-fx");

(function(d){
	
	// global variables
	var	urlbase = "http://search.twitter.com/search.json", 
		count = 0,
		urlRe = new RegExp("([A-Za-z]+://[A-Za-z0-9-_]+\\.[A-Za-z0-9-_%&\?\/.=]+)","g"),
		nop = function(){ /* do nothing */ }
	;
	
	// exposed so can be used in the formatter function dojo.string.substitute
	beer.replaceLinks = function(str){
		return str
			// replace direct url's in the tweet
			.replace(urlRe, function(m){
				return "<a href='" + m + "' target='_blank'>" + m + "</a>";
			})
			// and replace the @replies and references with links
			.replace(/@([\w]+)/, function(a,m){
				return "<a href='http://twitter.com/" + m + "'>@" + m + "</a>";
			})
		;
	}
	
	d.declare("beer.SearchTwitter", [dijit._Widget, dijit._Templated], {
		// summary: A Search box instance. 
		
		// interval: Integer
		//		Time to delay between polls. Twitter API limits to 100/hr
		interval:30000,
		
		// query: String
		//		A default search string to use. Override for each instance
		query:"#dojo",
		
		templatePath: dojo.moduleUrl("beer", "templates/Twitter.html"),
		
		// itemTemplate: String
		//		A template string to use for each Tweet-item. Filtered through dojo.string.substitute
		//		with each tweet data item as the content.
		itemTemplate: 
			"<li class='unseen'>" +
				"<div>" +
					"<a target='_blank' href='http://twitter.com/${from_user}'>" +
						"<img style='float:left' src='${profile_image_url}' />" +
					"</a><p>${text:beer.replaceLinks}</p>" +
				"</div>" +
			"</li>",
			
		// childSelector: String
		//		A CSS3 query string used to identifiy each child.
		childSelector: "> li",

		postCreate: function(){

			this._callbacks = {};
			this._seenIds = {};
			this._query = encodeURIComponent(this.query);
			this._baseInterval = this.interval;
			this.poll();
			this.update(); // always do it now
			
			this.connect(this.domNode, "onclick", "_onclick");
			this.connect(this.closeIcon, "onclick", "_onclose");
			
		},
		
		_onclick: function(e){
			// summary: Handle all clicks within our domNode
			
			if(!e.target.href && !e.target.parentNode.href){
				// if the link isn't a real link (or a direct child of a link (eg: a->img)), do stuff:
				e.preventDefault();
				
				var l = d.query(".unseen", this.containerNode);

				if(l.length > 100){
					// too many to animate smoothly imo, just set style
					l.style("backgroundColor", "#fff").removeClass("unseen");
				}else{
					// animate them instead
					l.animateProperty({
						properties: {
							backgroundColor:"#fff"
						},
						// then set the 'seen' state
						onEnd: function(){ 
							l.removeClass("unseen");
						}
					}).play();
				}
				
				// update the unseen count, and publish the notification 
				// in case anyone cares to listen.
				d.fadeOut({ 
					node: this.newCount, 
					onEnd: function(n){
						n.innerHTML = "";
						d.style(n, "opacity", 1);
						d.publish("/new/tweets", []);
					}
				}).play();
				
			}
		},
			
		_onclose: function(e){
			// summary: Handle clicks for the close icon
			this.stop();
			d.fadeOut({ 
				node: this.domNode, 
				onEnd: d.hitch(this, "destroy", false)
			}).play();
		},
		
		update: function(){
			// summary: Trigger a new fetch for more data.
			
			// setup the jsonp callback:
			var id = "cb" + (count++);
			beer.SearchTwitter.__cb[id] = d.hitch(this, "_handle", id);
			
			// generate a url
			var url = [
				urlbase, "?",
				"q=", this._query,
				this.maxId ? "&since_id=" + this.maxId : "",
				"&callback=beer.SearchTwitter.__cb.", id
			].join("");
			
			// fetch:
			d.addScript(url, function(){}); // null function 
		},
		
		_handle: function(id, response){
			// summary: Handle the incoming data for this request.
			
			this._items = this.children();
			
			if(this.maxId && response.max_id > this.maxId){
				// reset the timer is we've gotten a new item
				this.interval = this._baseInterval;
			}
			// update the new maxid
			this.maxId = response.max_id;
			
			// they come in backwards?
			response.results.reverse();
			
			if(!response.results.length){
				// if no new results, bump the interval a bit to prevent overusing the API
				this.stop();
				this.interval *= 1.25;
				this.poll();
			}else{
				// we have new results, add each of them:
				d.forEach(response.results, this._addItem, this);

				// update the ui
				this._addToCount(response.results.length);
				
				// remove extra tweets. we only want 15. _removeItem will not remove .unseen items, no worries.
				if(this._items.length){
					this.children().splice(15).forEach(this._removeItem, this).length;
				}
			}
			
			// erase our callback ref for memory
			delete beer.SearchTwitter.__cb[id];
		},
		
		poll: function(){
			// summary: Start the polling
			this._interval = setInterval(d.hitch(this, "update"), this.interval);
		},
		
		stop: function(){
			// summary: Stop the polling
			clearInterval(this._interval);
		},
		
		_addItem: function(data){
			// summary: Create a new child from a dataitem returned in the response.results.
			
			if(this._seenIds[data.id]){
				return; // no duplicates please.
			}
			this._seenIds[data.id] = true; 
			
			// create the markup from the itemTemplate and data
			var n = d.place(
				d.string.substitute(this.itemTemplate, data),
			 	this.containerNode, 
				"first"
			);

			// prepare the node
			d.style(n, {
				opacity:0,
				height:"0",
				overflow:"hidden"
			});
			
			// animate the node in. We're keeping track of all relevant running animations so we 
			// can be sure they aren't _all_ trying to wipein at once. This staggers them all,
			// and pops itself off when complete to decrement the delay
			var all = beer.SearchTwitter.anims;
			var a = d.fx.combine([
				d.fx.wipeIn({ duration:500, node: n }),
				d.fadeIn({ node: n, duration:700, onEnd: function(){
					setTimeout(function(){ all.pop(); }, 10);
				} })
			]);
			all.push(1);
			
			// play the animation
			a.play(50 * all.length);
		},
		
		_removeItem: function(n){
			// remove a child, but only if it has been seen
			if(!d.hasClass(n, "unseen")){
				d.fadeOut({
					node: n, onEnd: function(){
						d.destroy(n);
					}
				}).play();
			}
		},
		
		_addToCount: function(inc){
			// update the unseen count for this instance, and publish the info to the world
			var l = d.query(".unseen", this.containerNode).length;
			if(l > 200){ this.stop(); }
			if(l){
				this.newCount.innerHTML = "(" + l + ")";
				d.publish("/new/tweets", []);
			}
			
		},
		
		children: function(){
			// summary: return the children in this instance
			return d.query(this.childSelector, this.containerNode);
		}
		
	});
	
	// mix some properties onto the beer.SearchTwitter function (NOT the .protytpe). These are shared.
	d.mixin(beer.SearchTwitter, {
		// stub for callbacks to keep them namespaced nicely
		__cb:{},
		// all global animations for all instances:
		anims:[]
	})

})(dojo);