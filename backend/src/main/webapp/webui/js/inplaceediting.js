ijkl.module('inplaceediting', ['querySelector', 'classList'], function() {
    var as = ijkl('actionselector');
    var editor = document.getElementById('inplace-edit');
    var it = editor.querySelector('input[type=text]');
    var sb = editor.querySelector(as('save'));
    var cb = editor.querySelector(as('cancel'));
    var currentOnSubmit;
    editor.addEventListener('click', function(e) {
        e.stopPropagation();
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
    // onSubmit should be a function accepting (newValue, onSuccess, onReject)
    return function(anchor, initialVal, onSubmit) {
        it.value = initialVal;
        currentOnSubmit = onSubmit;
        locked = false;
        anchor.appendChild(editor);
    };
});