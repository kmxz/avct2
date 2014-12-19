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
    var popover = po(editor);
    editor.addEventListener('click', function () {
        ul.innerHTML = '';
    });
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
        ul.innerHTML = '';
        notChanged = true;
    };
    var clickListener = function (e) {
        e.stopPropagation();
        updateActive(this);
        selectActive();
    };
    var updateAc = function () {
        if (notChanged) {
            notChanged = false;
            return;
        }
        ul.innerHTML = '';
        var previousSelectedText = currentHighlightItem ? currentHighlightItem.innerHTML : null;
        var length = it.value.length;
        var allNodes = suggestionArray.filter(function (name) {
            return name.substring(0, length).toLowerCase() === it.value.toLowerCase();
        }).sort().map(function (name) {
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
    // onSubmit should be a function accepting (newValue, onSuccess, onReject)
    // suggestions would be an array of text
    var start = function (anchor, initialValue, onSubmit, suggestions) {
        it.value = initialValue;
        suggestionArray = suggestions;
        popover(anchor, function (onSuccess, onReject) {
            onSubmit(it.value, onSuccess, onReject);
        });
    };
    start.isOpen = popover.isOpen;
    return start;
});