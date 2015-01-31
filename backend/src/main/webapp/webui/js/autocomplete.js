/*globals ijkl*/

ijkl.module('autocomplete', ['querySelector', 'classList'], function () {
    "use strict";

    var dom = ijkl('dom');
    var po = ijkl('popover');

    var editor = document.getElementById('auto-complete');
    var it = editor.querySelector('input[type=text]');
    var ul = editor.querySelector('div.list-group');
    var currentHighlightItem = null;
    var suggestionArray = null;
    var notChanged = false;
    var stop = false;
    var popover = po(editor);
    var clear = function () {
        if (stop) {
            stop = false;
            return;
        }
        ul.innerHTML = '';
    };
    editor.addEventListener('click', clear);
    var updateActive = function (newItem) {
        if (currentHighlightItem) {
            currentHighlightItem.classList.remove('active');
        }
        if (newItem) {
            newItem.classList.add('active');
        }
        currentHighlightItem = newItem;
    };
    var selectActive = function () {
        it.value = currentHighlightItem.innerHTML;
        currentHighlightItem = null;
        clear();
        notChanged = true;
    };
    var clickListener = function (e) {
        e.stopPropagation();
        updateActive(this);
        selectActive();
    };
    var updateAc = function () {
        clear();
        if (notChanged) {
            notChanged = false;
            return;
        }
        var previousSelectedText = currentHighlightItem ? currentHighlightItem.innerHTML : null;
        var length = it.value.length;
        var allNodes = suggestionArray.filter(function (name) {
            return name.substring(0, length).toLowerCase() === it.value.toLowerCase();
        }).concat(suggestionArray.filter(function (name) {
            var ivl = it.value.toLowerCase();
            return (name.substring(0, length).toLowerCase() !== ivl) && (name.toLowerCase().indexOf(ivl) >= 0);
        })).map(function (name) {
            var a = dom('a', {href: 'javascript:void(0)', className: 'list-group-item'}, name);
            a.addEventListener('click', clickListener);
            return a;
        });
        updateActive(allNodes.filter(function (el) {
            return el.innerHTML === previousSelectedText;
        })[0]);
        dom.append(ul, allNodes);
    };
    it.addEventListener('keydown', function (e) {
        switch (e.keyCode) {
            case 38: // up
                updateActive((currentHighlightItem && currentHighlightItem.previousSibling) || ul.lastChild);
                break;
            case 40: // down
                updateActive((currentHighlightItem && currentHighlightItem.nextSibling) || ul.firstChild);
                break;
            case 13: // enter
                selectActive();
                break;
            default:
                return;
        }
        e.preventDefault();
    });
    it.addEventListener('keyup', updateAc);
    it.addEventListener('focus', function () {
        updateAc();
        stop = true;
        editor.addEventListener('click', clear);
    });
    // onSubmit should be a function accepting (newValue, onSuccess, onReject)
    // suggestions would be an array of text
    var start = function (anchor, initialValue, onSubmit, suggestions) {
        it.value = initialValue;
        suggestionArray = suggestions;
        popover(anchor, function (onSuccess, onReject) {
            onSubmit(it.value, onSuccess, onReject);
        });
        it.focus();
    };
    start.isOpen = popover.isOpen;
    return start;
});