"use strict";

ijkl.module('actionselector', [], function() {
    var get = function(action) {
        return 'javascript:void(\'' + action + '\')';
    };
    var selector = function(action) {
        return 'a[href="' + get(action) + '"]';
    };
    selector.get = get;
    return selector;
});
