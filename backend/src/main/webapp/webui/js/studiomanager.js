/*globals ijkl*/

ijkl.module('studiomanager', [], function () {
    "use strict";

    var api = ijkl('api');
    var ac = ijkl('autocomplete');
    var func = ijkl('function');

    var actualStudios = null;

    var open = function (anchor, currentVal, callback) {
        if (ac.isOpen()) {
            return;
        }
        ac(anchor, currentVal, function (newStudioName, onSuccess, onReject) {
            var proposedStudio = func.filter(actualStudios, function (name) {
                return name === newStudioName;
            })[0];
            if (!proposedStudio) {
                if (window.confirm("Such studio does not exist. Create one?")) {
                    api('studio/create', {'name': newStudioName}).then(function (ret) {
                        actualStudios[ret.id] = newStudioName; // manually append
                        callback(ret.id, onSuccess, onReject);
                    }, function (error) {
                        api.ALERT(error);
                        onReject();
                    });
                } else {
                    onReject();
                }
            } else {
                callback(proposedStudio, onSuccess, onReject);
            }
        }, func.toArray(actualStudios));
    };

    return {
        init: function () {
            return api('studio/list').then(function (json) {
                actualStudios = json;
            }, api.FATAL);
        },
        getStudios: function () {
            return actualStudios;
        },
        open: open
    };
});