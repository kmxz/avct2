/*globals ijkl*/

ijkl.module('function', ['es5Array'], function () {
    "use strict";

    var identity = function (input) {
        return input;
    };
    return {
        identity: identity,
        doNothing: function () {
        },
        toArray: function (obj) { // convert an array-like object to an array, or an object's values to an array
            var i, op;
            if (obj.length && typeof obj.length === 'number') { // array-like object
                return Array.prototype.map.call(obj, identity);
            }
            op = [];
            for (i in obj) {
                if (obj.hasOwnProperty(i)) {
                    op.push(obj[i]);
                }
            }
            return op;
        },
        forEach: function (assoc, func) { // forEach on an object
            var i;
            for (i in assoc) {
                if (assoc.hasOwnProperty(i)) {
                    func(assoc[i], i);
                }
            }
        },
        map: function (assoc, func) { // almost identical as above
            var i;
            var op = {};
            for (i in assoc) {
                if (assoc.hasOwnProperty(i)) {
                    op[i] = func(assoc[i], i);
                }
            }
            return op;
        },
        filter: function (assoc, func) { // filter an object to return keys
            return Object.keys(assoc).filter(function (key) {
                return func(assoc[key]);
            });
        }
    };
});