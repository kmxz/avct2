"use strict";

ijkl.module('popover', ['querySelector', 'classList'], function () {

    var as = ijkl('actionselector');
    var dom = ijkl('dom');

    return function (editor) {
        var sb = editor.querySelector(as('save'));
        var cb = editor.querySelector(as('cancel'));
        var currentOnSubmit;
        editor.addEventListener('click', function (e) {
            e.stopPropagation();
        });
        var hide = function () {
            document.body.appendChild(editor);
        };
        var locked;
        var lock = function () {
            locked = true;
            if (sb) {
                sb.classList.add('disabled');
            }
            if (cb) {
                cb.classList.add('disabled');
            }
        };
        var unlock = function () {
            locked = false;
            if (sb) {
                sb.classList.remove('disabled');
            }
            if (cb) {
                cb.classList.remove('disabled');
            }
        };
        if (sb) {
            sb.addEventListener('click', function (e) {
                e.stopPropagation();
                if (locked) {
                    return;
                }
                lock();
                currentOnSubmit(function () {
                    unlock();
                    hide();
                }, unlock);
            });
        }
        if (cb) {
            cb.addEventListener('click', function (e) {
                e.stopPropagation();
                if (locked) {
                    return;
                }
                hide();
            });
        }
        // onSubmit should be a function accepting (newValue, onSuccess, onReject)
        // suggestions would be an array of text
        var start = function (anchor, onSubmit) {
            locked = false;
            currentOnSubmit = onSubmit;
            var bcr = anchor.getBoundingClientRect();
            var toLeft = (bcr.left + bcr.right) / 2 > window.innerWidth / 2;
            editor.classList.remove(toLeft ? 'right' : 'left');
            editor.classList.add(toLeft ? 'left' : 'right');
            anchor.appendChild(editor);
        };
        start.isOpen = function () {
            return editor.parentNode !== document.body;
        };
        start.close = hide;
        return start;
    };
});
