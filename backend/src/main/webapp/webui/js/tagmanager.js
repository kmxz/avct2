"use strict";

ijkl.module('tagmanager', ['querySelector'], function() {
    var app = ijkl('app');
    var modal = ijkl('modal');
    var el = document.getElementById('tag-manager');
    el.querySelector('button.close').addEventListener('click', function() {
        modal.close(el);
    });
    var start = function() {
        modal.show(el);
    };
    return start;
});