dependencies = {
	
	// build arguments:
	stripConsole: "normal",
	action:"release",
	version:"1.4.0-dev",
	optimize:"shrinksafe",
	cssOptimize:"comments.keepLines",
	
	// the "layers"
	layers: [
		{
			// a single self-dependent layer
			name: "../beer/layer.js",
			dependencies: [
				"beer.layer"
			]
		}	
	],

	// the namespaces we care about:
	prefixes: [

		// define our non-dojo namespaces:
		[ "dijit", "../dijit" ],
		[ "dojox", "../dojox" ],
		[ "plugd", "../plugd" ],
		[ "beer", "../beer" ],
		
		// so the css get's munged, too:
		[ "styles", "../styles" ]

	]
};