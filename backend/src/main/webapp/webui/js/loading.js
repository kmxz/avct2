/*global ijkl*/

ijkl.module('loading', ['classList'], function () {
    "use strict";

    var dom = ijkl("dom");

    var mnb = document.getElementById('modal-notify-body');

    var wait = function (callback) {
        setTimeout(callback, 0); // use this instead of the original requestAnimationFrame, as rAF will only be called when current tab is active, and thus make background loading impossible
    };

    var loaded = function () {
        wait(function () {
            document.body.classList.add('loaded');
        });
    };

    loaded.appendThen = function (text, callback) {
        dom.append(mnb, dom('p', null, text));
        wait(callback);
    };

    return loaded;
});