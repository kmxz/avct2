"use strict";

ijkl.module('modal', ['querySelector', 'classList'], function() {

    var as = ijkl('actionselector');
    var func = ijkl('function');

    var mel = document.getElementById('modal-container');
    return {
        show: function(el) {
            func.toArray(mel.querySelectorAll('.modal-dialog')).forEach(function(m) {
                m.style.display = 'none';
            });
            el.style.display = 'block';
            mel.classList.add('active');
        },
        close: function() {
            mel.classList.remove('active');
        }
    };
})