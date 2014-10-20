ijkl.module('function', ['es5Array'], function() {
	var identity = function(input) { return input; }
	return {
		identity: identity,
		doNothing: function() {},
		toArray: function(obj) {
			return Array.prototype.map.call(obj, identity);
		}
	};
});