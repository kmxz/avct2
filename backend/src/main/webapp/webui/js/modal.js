"use strict";

ijkl.module('modal', ['querySelector', 'classList'], function() {
    var as = ijkl('actionselector');
    return {
        show: function(el) {
            el.classList.add('active');
        },
        close: function(el) {
            el.classList.remove('active');
        }
    };
})