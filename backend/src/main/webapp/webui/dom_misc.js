ijkl.module('actionselector', [], function() {
    return function(action) {
        return 'a[href="javascript:void(\'' + action + '\')"]';
    }
});

ijkl.module('modal', ['querySelector', 'classList'], function() {
    var as = ijkl('actionselector');
    return {
        show: function(el) {
            el.classList.add('active');
        },
        close: function(el) {
            el.classList.remove('active');
        }
    };
})