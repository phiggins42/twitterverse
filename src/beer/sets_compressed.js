dojo.provide("beer.sets");
dojo.require("dojo.cookie");
(function(d){
var _1={};
d.mixin(beer.sets,{add:function(e){
e&&e.preventDefault();
var _2=beer._getSearches().map(function(w){
return {q:w.query,a:w.auth?1:0};
});
var _3=_2.length?prompt("Name this set:"):false;
if(_3&&!_1[_3]){
_1[_3]=_2;
this._set(_1);
this._addMenuItem(_3);
}else{
d.publish("/system/warning",["Need to select a unique name for your set"]);
}
},_addMenuItem:function(_4){
var n=dojo.place("<li><a href='#'>"+_4+"</a></li>",this.setsNode,"first");
d.connect(n,"onclick",d.hitch(this,"_loadSet",_4));
var rn=dojo.place(dojo.clone(n),this.clearSetsNode,"first");
d.connect(rn,"onclick",d.hitch(this,"_removeSet",_4,[n,rn]));
},_loadSet:function(_5,e){
e&&e.preventDefault();
var _6=this._get()[_5];
if(_6){
var _7=d.map(_6,function(_8){
return _8.q;
});
var _9=beer._getSearches().filter(function(w){
return d.indexOf(_7,w.query)<0;
}).forEach(function(w){
w._onclose();
});
d.forEach(_6,function(_a){
if(!beer._getSearches().some(function(w){
return w.query==_a.q;
})){
new beer[(_a.a?"PublicStream":"SearchTwitter")]({query:_a.q,maxId:_a.id}).placeAt("ender","before");
}
});
}
},_removeSet:function(_b,_c,e){
e&&d.stopEvent(e);
var _d=this._get();
if(_d&&_d[_b]){
delete _d[_b];
this._set(_d);
d.forEach(_c||[],d.destroy,d);
}
},_get:function(){
return d.fromJson(d.cookie("tvsets"));
},_set:function(_e){
_1=_e;
return d.cookie("tvsets",d.toJson(_e));
},__reset:function(){
},init:function(){
this.setsNode=d.query("#setsMenu + ul")[0]||d.place("<ul></ul>","setsMenu","after");
this.clearSetsNode=d.query("#clearMenu + ul")[0]||d.place("<ul></ul>","clearMenu","after");
var _f=_1=this._get();
if(_f){
for(var i in _f){
this._addMenuItem(i);
}
}
}});
})(dojo);

