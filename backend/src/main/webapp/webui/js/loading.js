"use strict";

ijkl.module('loading', ['classList'], function() {
    return function() {
        // it's weird, but under Chrome, two levels of requestAnimationFrame will ensure the the fonts get loaded, one does not
        window.requestAnimationFrame(function() {
            window.requestAnimationFrame(function() {
                document.body.classList.add('loaded');
            });
        });
    }
});