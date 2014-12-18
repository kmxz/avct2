"use strict";

ijkl.module('function', ['es5Array'], function () {
    var identity = function (input) {
        return input;
    };
    return {
        identity: identity,
        doNothing: function () {
        },
        toArray: function (obj) {
            var i, op;
            if (obj.length && typeof obj.length === 'number') { // array-like object
                return Array.prototype.map.call(obj, identity);
            } else {
                op = [];
                for (i in obj) {
                    if (obj.hasOwnProperty(i)) {
                        op.push(obj[i]);
                    }
                }
                return op;
            }
        },
        forEach: function (assoc, func) {
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
        }
    };
});