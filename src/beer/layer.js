//	Provide the `beer` resource. This is a "rollup" file for all this 
//	application's JavaScript. In production, it will be a single file.
dojo.provide("beer.layer");

//	externalize our `base` code, to keep this `layer` as nothing
//	more than a list of modules.
dojo.require("beer._base");