/*global ijkl*/

ijkl.module('loading', ['classList'], function () {
    "use strict";

    return function () {
        // it's weird, but under Chrome, two levels of requestAnimationFrame will ensure the the fonts get loaded, one does not
        window.requestAnimationFrame(function () {
            window.requestAnimationFrame(function () {
                document.body.classList.add('loaded');
            });
        });
    };
});