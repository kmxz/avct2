/*globals ijkl*/

ijkl.module('studiomanager', [], function () {
    "use strict";

    var api = ijkl('api');

    var actualStudios = null;
    return {
        init: function () {
            return api('studio/list').then(function (json) {
                actualStudios = json;
            }, api.FATAL);
        },
        getStudios: function () {
            return actualStudios;
        }
    };
});