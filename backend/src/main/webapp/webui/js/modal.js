/*global ijkl*/

ijkl.module('modal', ['querySelector', 'classList'], function () {
    "use strict";

    var func = ijkl('function');

    var mel = document.getElementById('modal-container');
    var close = function () {
        mel.classList.remove('active');
    };
    var cel = function () {
        close();
        this.removeEventListener('click', cel);
    };
    return {
        show: function (el) {
            func.toArray(mel.querySelectorAll('.modal-dialog')).forEach(function (m) {
                m.style.display = 'none';
            });
            el.style.display = 'block';
            mel.classList.add('active');
            var closeBtn = el.querySelector('button.close');
            if (closeBtn) {
                closeBtn.addEventListener('click', cel);
            }
        },
        close: close
    };
});