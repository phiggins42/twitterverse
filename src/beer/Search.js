dojo.provide("beer.Search");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.fx");
dojo.require("dojo.NodeList-fx");
dojo.require("beer.filters");
dojo.require("beer.process");
dojo.require("beer.translate");
dojo.require("dojo.cache");

(function(d){
	
	// global variables
	var	urlbase = "http://search.twitter.com/search.json", 
		
		// matches http:// stuff
		urlRe = new RegExp("([A-Za-z]+://[A-Za-z0-9-_]+\\.[A-Za-z0-9-_%&\?\/.=]+)","g"),
		
		// dojo needs a null-op function
		nop = function(){ /* do nothing */ },

		// reuse ping() to notify UI of new items
		ping = d.partial(d.publish, "/new/tweets", []),

		// create a big hash of id's we've seen, to eliminate duplicates
		_seenIds = {}
	;
	
	// exposed so can be used in the formatter function dojo.string.substitute
	beer.replaceLinks = function(str){
		return str
			// replace direct url's in the tweet
			.replace(urlRe, function(m){
				// if longer than twenty, shorten to twenty.
				var ms = m.length > 20 ? m.slice(0, 17) + "..." : m,
					link = "<a href='" + m + "' title='" + m + "' target='_blank'>" + ms + "</a>",
					service = beer.process.getService(m),
					api = beer.process.services[service]
				;
				
				if(api){
					var largest = api.full ? api.full(m) : api.thumb ? api.thumb(m) : api.mini ? api.mini(m) : false;
					if(largest){
						link += " <img class='zoomicon' src='src/styles/images/external.png' rel='" + largest +"'>"
					}
				}
				
				return link;
			})
			
			// and replace the @replies and references with links
			.replace(/@([\w]+)/g, function(_, m){
				return "<a href='http://twitter.com/" + m + "' target='_blank'>@" + m + "</a>";
			})

			// basic wiki syntax stuff. probably a better way.
			.replace(/\s*_([\w]+)_\s*/g, function(_, m){
				return " <em>" + m + "</em> ";
			})
			.replace(/\s*\*([\w]+)\*\s*/g, function(_, m){
				return " <strong>" + m + "</strong> ";
			})
			
		;
	};

	beer.fixurl = function(str){
		// summary: Fix up a URL so that it may be passed to twitter.com/?status=
		return encodeURI(str);
	};
	
	d.declare("beer.SearchTwitter", [dijit._Widget, dijit._Templated], {
		// summary: A Search box instance. 
		
		// interval: Integer
		//		Time to delay between polls. Twitter API limits to 100/hr
		interval:60000,
		
		// query: String
		//		A default search string to use. Override for each instance
		query:"#dojo OR #dojobeer",
		
		templatePath: dojo.moduleUrl("beer", "templates/Twitter.html"),
		
		// itemTemplate: String
		//		A template string to use for each Tweet-item. Filtered through dojo.string.substitute
		//		with each tweet data item as the content.
		itemTemplate: dojo.trim(dojo.cache("beer", "templates/ItemTemplate.html")), 

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
		
		constructor: function(args){
			this.filters = args.filters || ["RT", "OVERZEALOUS"] // "CUSTOM", "USERS"];
		},
		
		postCreate: function(){

			this._query = encodeURIComponent(this.query);
			this._baseInterval = this.interval;

			this.poll();
			this.update(); // always do it now
			
			this.connect(this.actions, "onclick", "_actions");
			
		},
		
		_markRead: function() {
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
		},

		_actions : function(e) {
			switch (e.target) {
				case this.closeIcon :
					this._onclose();
				break;
				
				case this.markReadIcon : 
					this._markRead();
				break;
			}
		},
		
		_onclick: function(e){
			// summary: Handle all clicks within our domNode
			
			if(!e.target.href && !e.target.parentNode.href){
				// if the link isn't a real link (or a direct child of a link (eg: a->img)), do stuff:
				e.preventDefault();
				this._markRead();
			}
		},
			
		_onclose: function(e){
			// summary: Handle clicks for the close icon
			this.stop();
			d.animateProperty({ 
				node: this.domNode,
				properties: {
					width: 20, opacity: 0
				},
				duration: 600,
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
			dojo.addScript(url, d.hitch(this, "_handle", true));
		},
		
		_handle: function(shift, response){
			// summary: Handle the incoming data for this request.
			
			this._items = this.children();
			
			if(this.maxId && response.max_id > this.maxId){
				// reset the timer is we've gotten a new item
				this.interval = this._baseInterval;
			}
			// update the new maxid
			this.maxId = Math.max(this.maxId, response.max_id);
			
			if(shift){
				// for the public-timeline branch. data comes back as array of results[]
				response = response.results;
			}
			
			// they come in backwards?
			response.reverse();
			
			if(!response.length){
				// if no new results, bump the interval a bit to prevent overusing the API
				this.stop();
				this.interval *= 1.25;
				this.poll();
			}else{
				// we have new results, add each of them:
				
				// FIXME: make this part of the pre-filtering API. RT removal should
				// be optional and per instance. maybe just UI?
				d.forEach(this._runFilters(response), this._addItem, this);

				// update the ui
				this._addToCount(response.length);
				
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
			
			if(_seenIds[data.id]){
				return; // no duplicates please.
			}
			_seenIds[data.id] = true; 
			
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
		
			this._createItemNode(data);
		},
		
		_createItemNode: function(data){
			
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
			
			this._checkTranslate(n, data);
			
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
		
		_checkTranslate: function(n, data){
			// summary: Determine if 'data' is a tweet item that needs translating. And handle it.
			var lang = data.iso_language_code;
			if(lang && lang !== beer.config.locale){ 
				var target = d.query(".tweettext", n), text = target[0].innerHTML
				beer.translate(text).addCallback(function(cbd){
					// careful, this callback fails silently for some reason
					var c = cbd && cbd.responseData;
					// sometimes google thinks this language isn't what twitter said, trust google.
					if(c.translatedText && c.detectedSourceLanguage !== beer.config.locale){
						target[0].innerHTML = c.translatedText + 
							" - <em>[lang:" + c.detectedSourceLanguage + "]</em>";
					}
				});
			}	
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
		},
				
		_runFilters: function(ar){
			// summary: Run through each of the registered filters for this instance
			// 		removing anything that matches a criteria
			return dojo.filter(ar, function(item){
				return dojo.every(this.filters, function(filter){
					return beer.filters[filter](item);
				})
			}, this);
		}
		
	});
	
	// mix some properties onto the beer.SearchTwitter function (NOT the .protytpe). These are shared.
	d.mixin(beer.SearchTwitter, {
		// all global animations for all instances:
		anims:[]
	});
	
	dojo.declare("beer.PublicStream", beer.SearchTwitter, {
		// summary: a version of Search box that only handles a public_timeline for a username
		// pass query:"username" to load twitter.com/username feed
		
		itemTemplate: dojo.trim(dojo.cache("beer.templates", "PublicItemTemplate.html")),
		
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
			dojo.addScript(url, d.hitch(this, "_handle", false));
		},
			
		_addItem: function(data){
			// summary: Create a new child from a dataitem returned in the response.results.
			
			if(_seenIds[data.id]){
				return; // no duplicates please.
			}
			_seenIds[data.id] = true; 

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
			
			this._createItemNode(data);
		
		},
		
		postCreate: function(){
			this.inherited(arguments);
			d.addClass(this.domNode, "public");
		}
		
	});

})(dojo);
