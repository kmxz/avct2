ijkl.module('inplaceediting', ['querySelector'], function() {
    var as = ijkl('actionselector');
    var editor = document.getElementById('inplace-edit');
    var it = editor.querySelector('input[type=text]');
    var currentOnSubmit;
    var hide = function() {
        document.body.appendChild(editor);
    };
    editor.querySelector(as('save')).addEventListener('click', function() {
        currentOnSubmit(it.value, hide);
    });
    editor.querySelector(as('cancel')).addEventListener('click', hide);
    return function(initialVal, onSubmit) {
        currentOnSubmit = onSubmit;
        return editor;
    };
});