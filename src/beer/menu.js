dojo.provide("beer.menu");
dojo.require("plugd.base");
(function(d){
	
	// my janktastic plain UL menu thinger. stolen from plugd, but little to no modifications.
	
	d.extend(d.NodeList, {
		menu: function(){
			return this.forEach(function(n){
				
				d.addClass(n, "dijitMenuBar");
				
				// top level menu items:
				var tl = d.query("> ul > li", n)
					// make it easier to style:
					.hoverClass("selected");
				
				// setup behavior all all items:
				d.query("ul > li", n)
					.forEach(function(n){
						// determine if this LI has a submenu
						var child = d.query("> ul", n)[0];
						if(child){

							if(tl.indexOf(n) === -1){
								// this link is NOT a top-level menu item
								d.query("a", n).at(0).addClass("dijitMenuHasChildren");
							}

							var func = d.partial(d.style, child, "left");
							func("-999em");

							d.connect(n, "onmouseenter", function(e){
								func("");
							});
							d.connect(n, "onclick", function(e){
								func("");
							});
							d.connect(n, "onmouseleave", function(e){
								func("-999em");
							});
						}
					})
				;
			});
		}
	});
	
})(dojo);