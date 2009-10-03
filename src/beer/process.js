dojo.provide("beer.process");
dojo.require("dojox.image.LightboxNano");

// this file handles the behavior of links on the page pointing to a image/video service we know about

(function(){

	// a simple regexp as most services use simple url forms like http://me.com/someShortUrl
	var simpleRe = /\.\w+\/(\w+)$/, // fixme: find a more clever regexp
		simpleId = function(url){
			var m = url.match(simpleRe);
			return m && m[1];
		}
	;
	
	// the base popup object which can be mixed etc. 
	var process = {
		
		// borrowed from generic link-matching regexp, could be simplified to contraints of test
		// NOTE: this re will match both plaintext urls and urls inside of markup, so don't use
		// as a post-process step.
		_urlRe: new RegExp("([A-Za-z]+://([A-Za-z0-9-_\\.]+)\\.[A-Za-z0-9-_%&\?\/.=]+)","g"),
		
		getService: function(url){
			// summary: Return the service name from a url, or undefined if no service found
			var r, le = url.replace(process._urlRe, function(_, __, host){
				if(process.services[host]){
					r = host;
				}
				return _;
			});
			return r;
		},
		
		// key of various media services to look for. pseudo AdapterRegistry
		services: {
			
			"yfrog": {
				full: function(url){
					return url + ":iphone"; // fit to 480px, best we can get it seems
				},
				thumb: function(url){
					return url + ".th.jpg";
				}
				// hmm, no full available?
			},

			"pix":{
				full: function(url){
					return url + "/full";
				},
				thumb: function(url){
					return url + "/thumbnail";
				//	return this._base + "/" + this._id(url) + "/thumbnail";
				},
				tiny: function(url){
					return url + "/small";
				//	return this._base + "/" + this._id(url) + "/small";
				}
			},

			"img": {
				_base: "http://img.ly", 
				_id: simpleId,
				full: function(url){
					return this._base + "/show/full/" + this._id(url);
				},
				thumb: function(url){
					return this._base + "/show/thumb/" + this._id(url);
				},
				tiny: function(url){
					return this._base + "/show/mini/" + this._id(url);
				}
			},
			
			"twitgoo": {
				_base: "http://twitgoo.com", 
				_id: simpleId,
				thumb: function(url){
					return this._base + "/show/thumb/" + this._id(url);
				},
				full: function(url){
					return this._base + "/show/img/" + this._id(url);
				}
			},
			
			"twitpic": {
				_base: "http://twitpic.com",
				_id: simpleId,
				thumb: function(url){
					return this._base + "/show/thumb/" + this._id(url); 
				}, 
				full: function(url){
					return this._base + "/show/full/" + this._id(url);
				}
			},
			
			// will require swfObject or the like. non-trivial, but entirely possible.
//			"youtube": {
//				thumb: function(url){ return false; },
//			},
			
//			"vimeo": {
//				thumb: function(url){ return false; },
//			},

			// TODO: APIs either don't exist or ubsupported
//			"flickr": {
//				_id: function(url){
//					// do the magic, figure it out. 
//				},
//				thumb: function(url){
//					return false; 
//				}
//			}
		}
		
	};
	
	// this isn't right, this is a quick port and needing namespaces
	dojo.mixin(beer.process, process);

	// fixme: this is just the dojo implementation, showing the image can be done however.
	dojo.addOnLoad(function(){

		// lightbox needs a theme: (which means most of tundra. we could make that smaller. see main.css)
		dojo.addClass(dojo.body(), "tundra");
		
		// the popup to show. Not wanting to use LightboxDialog, need something lighter imo. 
		var lb = new dojox.image.LightboxNano();

		// listen on window: pseudo-live(.zoomicon)
		dojo.connect(dojo.doc, "onclick", function(e){
			var t = e && e.target;
			if(t && dojo.hasClass(t, "zoomicon")){
				dojo.style(t,"opacity","0.5"); // set itpartially hidden after first click
				var link = dojo.attr(t, "rel");
				link && lb.show({ href: link, origin: e.target, title: link });
			}
		});
		
	});

})();