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
            /* TODO: not listen again for the same button
            el.querySelector('button.close').addEventListener('click', function() {
                modal.close(el);
                tb.innerHTML = ''; // dirty method to free some resources
            });
            */
        },
        close: function() {
            mel.classList.remove('active');
        }
    };
})