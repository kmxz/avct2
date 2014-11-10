"use strict";

ijkl.module('function', ['es5Array'], function() {
	var identity = function(input) { return input; }
	return {
		identity: identity,
		doNothing: function() {},
		toArray: function(obj) {
			return Array.prototype.map.call(obj, identity);
		},
		forEach: function(assoc, func) {
			var i;
			for (i in assoc) {
				if (assoc.hasOwnProperty(i)) {
					func(assoc[i], i);
				}
			}
		},
		map: function(assoc, func) { // almost identical as above
			var i;
			var op = {};
			for (i in assoc) {
				if (assoc.hasOwnProperty(i)) {
					op[i] = func(assoc[i], i);
				}
			}
			return op;
		}
	};
});