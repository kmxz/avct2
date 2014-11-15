ijkl.module('autocomplete', ['querySelector', 'classList'], function() {

    var as = ijkl('actionselector');
    var dom = ijkl('dom');

    var editor = document.getElementById('auto-complete');
    var it = editor.querySelector('input[type=text]');
    var sb = editor.querySelector(as('save'));
    var cb = editor.querySelector(as('cancel'));
    var ul = editor.querySelector('div.list-group');
    var currentHighlightItem = null;
    var suggestionArray = null;
    var currentOnSubmit = null;
    var notChanged = false;
    editor.addEventListener('click', function(e) {
        e.stopPropagation();
        ul.innerHTML = '';
    });
    var hide = function() {
        document.body.appendChild(editor);
    };
    var locked;
    var lock = function() {
        locked = true;
        sb.classList.add('disabled');
        cb.classList.add('disabled');
    };
    var unlock = function() {
        locked = false;
        sb.classList.remove('disabled');
        cb.classList.remove('disabled');
    };
    sb.addEventListener('click', function(e) {
        e.stopPropagation();
        if (locked) { return; }
        lock();
        currentOnSubmit(it.value, function() {
            unlock();
            hide();
        }, unlock);
    });
    cb.addEventListener('click', function(e) {
        e.stopPropagation();
        if (locked) { return; }
        hide();
    });
    var clickListener = function(e) {
        e.stopPropagation();
        updateActive(this);
        selectActive();
    };
    var updateAc = function() {
        if (notChanged) { notChanged = false; return; }
        ul.innerHTML = '';
        var previousSelectedText = currentHighlightItem ? currentHighlightItem.innerHTML : null;
        var length = it.value.length;
        var allNodes = suggestionArray.filter(function(name) {
            return name.substring(0, length).toLowerCase() === it.value.toLowerCase();
        }).sort().map(function(name) {
            var a = dom('a', { href: 'javascript:void(0)', className: 'list-group-item' }, name);
            a.addEventListener('click', clickListener);
            return a;
        });
        updateActive(allNodes.filter(function(el) { return el.innerHTML === previousSelectedText; })[0]);
        dom.append(ul, allNodes);
    };
    var updateActive = function(newItem) {
        if (currentHighlightItem) {
            currentHighlightItem.classList.remove('active');
        }
        if (newItem) {
            newItem.classList.add('active');
        }
        currentHighlightItem = newItem;
    };
    var selectActive = function() {
        it.value = currentHighlightItem.innerHTML;
        currentHighlightItem = null;
        ul.innerHTML = '';
        notChanged = true;
    };
    it.addEventListener('keydown', function(e) {
        switch(e.keyCode) {
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
    var start = function(anchor, initialValue, onSubmit, suggestions) {
        it.value = initialValue;
        currentOnSubmit = onSubmit;
        locked = false;
        suggestionArray = suggestions;
        var bcr = anchor.getBoundingClientRect()
        var toLeft = (bcr.left + bcr.right) / 2 > window.innerWidth / 2
        editor.classList.remove(toLeft ? 'right' : 'left')
        editor.classList.add(toLeft ? 'left' : 'right')
        anchor.appendChild(editor);
    };
    start.isOpen = function() {
        return editor.parentNode !== document.body;
    };
    return start;
});