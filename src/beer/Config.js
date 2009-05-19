dojo.provide("beer.Config"); // the Config box
// this is experimental. just playing around with the concept of settings
dojo.require("dijit._Widget");

dojo.declare("beer.Config", dijit._Widget, {
	
	postCreate: function(){
		this.connect(this.domNode, "onsubmit", "_apply");
		this.formNode = dojo.query("form", this.domNode)[0];
	},
	
	_apply: function(e){
		e && e.preventDefault();
		
		var data = dojo.formToObject(this.formNode);		
		console.log("applying changes", data);
		
	}
	
});

dojo.addOnLoad(function(){
	// it is just a singleton really
	new beer.Config({}, "config");
})