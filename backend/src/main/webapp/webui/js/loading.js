/*global ijkl*/

ijkl.module('loading', ['classList'], function () {
    "use strict";

    var dom = ijkl("dom");

    var mnb = document.getElementById('modal-notify-body');

    var wait = function (callback) {
        // it's weird, but under Chrome, two levels of requestAnimationFrame will ensure the the fonts get loaded, one does not
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                callback();
            });
        });
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