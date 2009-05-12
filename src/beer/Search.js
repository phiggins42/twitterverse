dojo.provide("beer.Search");

dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.fx");
dojo.require("dojo.NodeList-fx");

(function(){
	
	var	urlbase = "http://search.twitter.com/search.json", 
		count = 0,
		urlRe = new RegExp("([A-Za-z]+://[A-Za-z0-9-_]+\\.[A-Za-z0-9-_%&\?\/.=]+)","g");
		
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
	
	dojo.declare("beer.SearchTwitter", [dijit._Widget, dijit._Templated], {
		// summary: A Search box instance. 
		
		interval:30000,
		query:"#dojo",
		templatePath: dojo.moduleUrl("beer", "templates/Twitter.html"),
		itemTemplate: 
			"<li class='unseen'>" +
				"<div>" +
					"<a target='_blank' href='http://twitter.com/${from_user}'>" +
						"<img style='float:left' src='${profile_image_url}' />" +
					"</a><p>${text:beer.replaceLinks}</p>" +
				"</div>" +
			"</li>",
		childSelector: "> li",

		postCreate: function(){

			this._callbacks = {};
			this._seenIds = {};
			this._query = encodeURIComponent(this.query);
			this._baseInterval = this.interval;
			this.poll();
			this.update(); // always do it now
			
			this.connect(this.domNode, "onclick", function(e){
				if(!e.target.href){
					e.preventDefault();
					var l = dojo.query(".unseen", this.containerNode);
					l.animateProperty({
						properties: {
							backgroundColor:"#fff"
						},
						onEnd: function(){ 
							l.removeClass("unseen");
						}
					}).play();
					
					dojo.fadeOut({ 
						node: this.newCount, 
						onEnd: function(n){
							n.innerHTML = "";
							dojo.style(n, "opacity", 1);
						}
					}).play();
				}
			});
			
			this.connect(this.closeIcon, "onclick", function(e){
				this.stop();
				dojo.fadeOut({ 
					node: this.domNode, 
					onEnd: dojo.hitch(this, "destroy", false)
				}).play();	
			});
		},
		
		update: function(){
			var id = "cb" + (count++);

			beer.SearchTwitter.__cb[id] = dojo.hitch(this, "_handle", id);
			
			var url = [
				urlbase, "?",
				"q=", this._query,
				this.maxId ? "&since_id=" + this.maxId : "",
				"&callback=beer.SearchTwitter.__cb.", id
			].join("");
			
			dojo.addScript(url, function(){});
		},
		
		_handle: function(id, response){
			this._items = this.children();
			
			if(this.maxId && response.max_id > this.maxId){
				// reset the timer is we've gotten a new item
				this.interval = this._baseInterval;
			}
			this.maxId = response.max_id;
			
			response.results.reverse();
			if(!response.results.length){
				this.stop();
				this.interval *= 1.25;
				this.poll();
			}else{
				dojo.forEach(response.results, this._addItem, this);

				this._addToCount(response.results.length);
				if(this._items.length){
					this.children().splice(15).forEach(this._removeItem, this).length;
				}
			}
			
			delete beer.SearchTwitter.__cb[id];
		},
		
		poll: function(){
			this._interval = setInterval(dojo.hitch(this, "update"), this.interval);
		},
		
		stop: function(){
			clearInterval(this._interval);
		},
		
		_addItem: function(data){

			if(this._seenIds[data.id]){
				return;
			}
			
			this._seenIds[data.id] = true; 
			var n = dojo.place(
				dojo.string.substitute(this.itemTemplate, data),
			 	this.containerNode, 
				"first"
			);

			dojo.style(n, {
				opacity:0,
				height:"0",
				overflow:"hidden"
			});
			
			var all = beer.SearchTwitter.anims;
			var a = dojo.fx.combine([
				dojo.fx.wipeIn({ duration:500, node: n }),
				dojo.fadeIn({ node: n, duration:700, onEnd: function(){
					setTimeout(function(){ all.pop(); }, 10);
				} })
			]);
			
			all.push(1);
			
			a.play(50 * all.length);
		},
		
		_removeItem: function(n){
			if(!dojo.hasClass(n, "unseen")){
				dojo.fadeOut({
					node: n, onEnd: function(){
						dojo.destroy(n);
					}
				}).play();
			}			
		},
		
		_addToCount: function(inc){
			
			var l = dojo.query(".unseen", this.containerNode).length;
			if(l > 200){ this.stop(); }
			if(l){
				this.newCount.innerHTML = "(" + l + ")";
			}
			
		},
		
		children: function(){
			return dojo.query(this.childSelector, this.containerNode);
		}
		
	});
	
	dojo.mixin(beer.SearchTwitter, {
		__cb:{},
		anims:[]
	})

})();