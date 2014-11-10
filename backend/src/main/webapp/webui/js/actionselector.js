"use strict";

ijkl.module('actionselector', [], function() {
    return function(action) {
        return 'a[href="javascript:void(\'' + action + '\')"]';
    }
});
