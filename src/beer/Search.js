dojo.provide("beer.Search");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.fx");
dojo.require("dojo.NodeList-fx");

(function(d){
	
	// global variables
	var	urlbase = "http://search.twitter.com/search.json", 
		
		// matches http:// stuff
		urlRe = new RegExp("([A-Za-z]+://[A-Za-z0-9-_]+\\.[A-Za-z0-9-_%&\?\/.=]+)","g"),
		
		// dojo needs a null-op function
		nop = function(){ /* do nothing */ },

		// reuse ping() to notify UI of new items
		ping = d.partial(d.publish, "/new/tweets", []),

		// templates for Search and Public
		cachedTemplate, 
		cachedPublicTemplate
	;
	
	// exposed so can be used in the formatter function dojo.string.substitute
	beer.replaceLinks = function(str){
		return str
			// replace direct url's in the tweet
			.replace(urlRe, function(m){
				// if longer than two, shorten.
				var ms = m.length > 20 ? m.slice(0, 17) + "..." : m;
				return "<a href='" + m + "' title='" + m + "' target='_blank'>" + ms + "</a>";
			})
			// and replace the @replies and references with links
			.replace(/@([\w]+)/g, function(_, m){
				return "<a href='http://twitter.com/" + m + "'>@" + m + "</a>";
			})
		;
	}
	
	beer.fixurl = function(str){
		// summary: Fix up a URL so that it may be passed to twitter.com/?status=
		return encodeURI(str);
	}
	
	d.declare("beer.SearchTwitter", [dijit._Widget, dijit._Templated], {
		// summary: A Search box instance. 
		
		// interval: Integer
		//		Time to delay between polls. Twitter API limits to 100/hr
		interval:30000,
		
		// query: String
		//		A default search string to use. Override for each instance
		query:"#dojo OR #dojobeer",
		
		templatePath: dojo.moduleUrl("beer", "templates/Twitter.html"),
		
		// itemTemplate: String
		//		A template string to use for each Tweet-item. Filtered through dojo.string.substitute
		//		with each tweet data item as the content.
		itemTemplate:"", 

		// showRT: Boolean
		//		Filter out Tweets starting with "RT" if set false.
		showRT: false, 
		
		// childSelector: String
		//		A CSS3 query string used to identifiy each child.
		childSelector: "> li",

		// auth: Boolean
		//		Trigger to let outside things know this box is "special" 
		//		and may popup a prompt()
		auth: false,
		
		// maxId: Integer
		//		Optional max_id to start with (for instance from loading sets)
		//		defaults to a falsy "0", and is populated after determining
		//		the highest seen id.
		maxId: 0,
		
		postCreate: function(){

			this._seenIds = {};
			this._query = encodeURIComponent(this.query);
			this._baseInterval = this.interval;
			
			if(!cachedTemplate){
				dojo.xhrGet({
					url: d.moduleUrl("beer", "templates/ItemTemplate.html"),
					load: d.hitch(this, function(data){
						cachedTemplate = this.itemTemplate = d.trim(data);
					}),
					sync:true
				});
			}else{
				this.itemTemplate = cachedTemplate;
			}

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
							color:"#999",
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
						ping();
					}
				}).play();
				
			}
		},
			
		_onclose: function(e){
			// summary: Handle clicks for the close icon
			this.stop();
			d.animateProperty({ 
				node: this.domNode,
				properties:{
					width:20, opacity:0
				},
				duration:600,
				onEnd: d.hitch(this, function(){
					this.destroy();
					ping();
				})
			}).play(15);
		},
		
		update: function(){
			// summary: Trigger a new fetch for more data.
			
			// generate a url
			var url = [
				urlbase, "?",
				"q=", this._query,
				this.maxId ? "&since_id=" + this.maxId : "",
				"&callback=?"
			].join("");
			
			// fetch:
			dojo.addScript(url, d.hitch(this, "_handle"));
		},
		
		_handle: function(response){
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
				
				d.forEach(this.showRT ? 
					// just pass the array
					response.results : 
					// else pass a filtered array omiting "RT" things 
					d.filter(response.results, function(item){
						return !(/^RT/.test(item.text));
					}),
				this._addItem, this);

				// update the ui
				this._addToCount(response.results.length);
				
				// remove extra tweets. we only want 15. _removeItem will not remove .unseen items, no worries.
				if(this._items.length){
					this.children().splice(15).forEach(this._removeItem, this).length;
				}
			}
			
			ping();
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
			
			// so not sure this is the right way to do this:
			// encode the retweet and reply strings now:
			var t = "http://twitter.com/home?status=";
			d.mixin(data, {

				retweetlink: [
					t, "RT @", data.from_user, " ", encodeURIComponent(data.text)
				].join("").replace(/%20/, " ").replace(/\ /g, "+"),

				replylink: [
					t, "@", data.from_user, " ",
					"&amp;in_reply_to_status_id=", data.id,
					"&amp;in_reply_to=", data.from_user
				].join("").replace(/\ /g, "+")

			});
			
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
			
			// setup some events for hoverstates:
			d.query(n).hoverClass("over");
			
			// animate the node in. We're keeping track of all relevant running animations so we 
			// can be sure they aren't _all_ trying to wipein at once. This staggers them all,
			// and pops itself off when complete to decrement the delay
			var all = beer.SearchTwitter.anims;
			var a = d.fx.combine([
				d.fx.wipeIn({ duration:500, node: n }),
				d.fadeIn({ 
					node: n, 
					duration:700, 
					onEnd: function(){
						setTimeout(function(){ all.pop(); }, 10);
					} 
				})
			]);
			all.push(1);
			
			ping();
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
				ping();
			}
			
		},
		
		children: function(){
			// summary: return the children in this instance
			return d.query(this.childSelector, this.containerNode);
		}
		
	});
	
	// mix some properties onto the beer.SearchTwitter function (NOT the .protytpe). These are shared.
	d.mixin(beer.SearchTwitter, {
		// all global animations for all instances:
		anims:[]
	})
	
	dojo.declare("beer.PublicStream", beer.SearchTwitter, {
		// summary: a version of Search box that only handles a public_timeline for a username
		// pass query:"username" to load twitter.com/username feed
		
		// FIXME: DRY, refactore update/handle/_addItem to handle schema/multiple templates
		
		update: function(){
			// summary: Trigger a new fetch for more data.
			
			// setup the jsonp callback:
			var urlbase = "http://twitter.com/statuses/friends_timeline.json";
			
			// generate a url
			var url = [
				urlbase, "?",
				"id=", this._query,
				this.maxId ? "&since_id=" + this.maxId : "",
				"&callback=?"
			].join("");
			
			// fetch:
			dojo.addScript(url, d.hitch(this, "_handle"));
		},
		
		_handle: function(response){
			// summary: Handle the incoming data for this request.
			
			this._items = this.children();
			
			if(this.maxId && response.max_id > this.maxId){
				// reset the timer is we've gotten a new item
				this.interval = this._baseInterval;
			}
			// update the new maxid
			this.maxId = response.max_id;
			
			// they come in backwards?
			response.reverse();
			
			if(!response.length){
				// if no new results, bump the interval a bit to prevent overusing the API
				this.stop();
				this.interval *= 1.25;
				this.poll();
			}else{
				// we have new results, add each of them:
				d.forEach(response, this._addItem, this);

				// update the ui
				this._addToCount(response.length);
				
				// remove extra tweets. we only want 15. _removeItem will not remove .unseen items, no worries.
				if(this._items.length){
					this.children().splice(15).forEach(this._removeItem, this).length;
				}
			}
			
			ping();
		},
		
		_addItem: function(data){
			// summary: Create a new child from a dataitem returned in the response.results.
			
			if(this._seenIds[data.id]){
				return; // no duplicates please.
			}
			this._seenIds[data.id] = true; 

			// so not sure this is the right way to do this:
			// encode the retweet and reply strings now:
			var t = "http://twitter.com/home?status=";
			d.mixin(data, {

				retweetlink: [
					t, "RT @", data.user.screen_name, " ", encodeURIComponent(data.text)
				].join("").replace(/%20/, " ").replace(/\ /g, "+"),

				replylink: [
					t, "@", data.user.screen_name, " ",
					"&amp;in_reply_to_status_id=", data.user.id,
					"&amp;in_reply_to=", data.user.screen_name
				].join("").replace(/\ /g, "+")

			});
			
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
			
			// setup some events for hoverstates:
			d.query(n).hoverClass("over");
			
			// animate the node in. We're keeping track of all relevant running animations so we 
			// can be sure they aren't _all_ trying to wipein at once. This staggers them all,
			// and pops itself off when complete to decrement the delay
			var all = beer.SearchTwitter.anims,
				a = d.fx.combine([
					d.fx.wipeIn({ duration:500, node: n }),
					d.fadeIn({ 
						node: n, 
						duration:700, 
						onEnd: function(){
							setTimeout(function(){ all.pop(); }, 10);
						} 
					})
				])
			;

			all.push(1);
			
			// play the animation, each staggered 50ms
			a.play(50 * all.length);
		},
		
		postCreate: function(){

			this._seenIds = {};
			this._query = encodeURIComponent(this.query);
			this._baseInterval = this.interval;
			
			if(!cachedPublicTemplate){
				d.xhrGet({
					url: d.moduleUrl("beer", "templates/PublicItemTemplate.html"),
					load: d.hitch(this, function(data){
						cachedPublicTemplate = this.itemTemplate = d.trim(data);
					}),
					sync:true
				});
			}else{
				this.itemTemplate = cachedPublicTemplate;
			}

			this.poll();
			this.update(); // always do it now
			
			this.connect(this.domNode, "onclick", "_onclick");
			this.connect(this.closeIcon, "onclick", "_onclose");
			
		}
		
	});

})(dojo);
