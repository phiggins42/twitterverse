dojo.provide("beer.translate");

dojo.require("dojo.cache");
dojo.require("dojox.rpc.Service");
dojo.require("dojo.io.script");

dojo.mixin(beer, {
	
	// goog: Object
	// 		The API for the various google services
	goog: new dojox.rpc.Service(dojo.fromJson(dojo.cache("dojox.rpc.SMDLibrary", "google.smd"))),
	
	translate: function(text, locale){
		// summary: Translate some text. Return a Deferred object to handle the response
		// text: String
		//		The text to translate (language auto-detected);
		// locale: String
		//		A two-letter version of the locale to translate TO. Defaults to EN. If passed, 
		//		overrides beer.config locale setting. 
		return beer.goog.translate({
			q: text,
			langpair: "|" + (locale || beer.config.locale)
		}); // dojo.Deferred
	}
	
});