/*global ijkl*/

ijkl.module('delegation', [], function () {
    "use strict";

    var isAncestor = function (child, parent) {
        if (!child) {
            return false;
        } // moving outside/inside the window
        var track = child;
        do {
            if (track === parent) {
                return true;
            }
            track = track.parentNode;
        } while (track);
        return false;
    };
    var oneOfAncestorsMatches = function (filter, element) {
        var track = element;
        do {
            if (filter(track)) {
                return track;
            }
            track = track.parentNode;
        } while (track);
        return null;
    };
    return {
        container: function (element, type, filter, callback) {
            element.addEventListener(type, function (e) {
                var el = e.target;
                while (el !== element) {
                    if (filter(el)) {
                        callback(el);
                    }
                    el = el.parentNode;
                }
            });
        },
        target: function (element, type, filter, callback) {
            element.addEventListener(type, function (e) {
                var ansMatch = oneOfAncestorsMatches(filter, e.target);
                if (ansMatch && !isAncestor(e.relatedTarget, ansMatch)) {
                    callback(ansMatch);
                }
            });
        }
    };
});