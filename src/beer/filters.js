dojo.provide("beer.filters");

// The filters available to each search instance. Each tweet is filtered through
// these functions. Returning true indicates the tweet "passes", false indicates
// a tweet should not be passed through to the client. 

dojo.mixin(beer.filters, {

	"RT": function(item){
		// hides re-tweets
		return !item.text.match(/^RT/);
	},
	
	"CUSTOM": function(item){
		// fixme: create a UI for maintaining terms in _customTerms exclustion list
		return dojo.every(beer._customTerms || [], function(term){
			var re = new RegExp(term, "ig");
			return !re.test(item.text);
		});
	},
	
	"USERS": function(item){
		// fixme: create a UI for maintaining the _blockUsers array. 
		return dojo.every(beer._blockUsers || [], function(name){
			return item.from_user.indexOf(name) < 0;
		});
	},
	
	"OVERZEALOUS": function(item){
		// nullify all "omgponies!!!" (any tweet with 3 or more consecutive !'s)
		return !item.text.match(/!{3}/g);
	},
	
	"TOPSHIT": function(item){
		// filter out all "Top 10" tweets. 
		return !item.text.match(/^top\ \d+/i)
	},
	
	"AUTOLOCATION": function(item){
		return !item.text.match(/^i\'m\ at/i);
	},
	
	"SUBTLEGRADIENT": function(item){
		// courtesy this[key] ^^
		return !item.text.match(/world\s*cup|GO+A?L|\bwatchin[g']\s|ESPN|red\s*card|^cheat(ed|ing)/ig);
	},
	
	"IONLYCAREABOUTJS": function(item){
		return item.text.match(/\.?J(ava)S(cript)/ig);
	},
	
	"THOSEGUYS": function(item){
		return !item.text.match(/@(cramforce|janl)/i);
	}

});