/*globals ijkl*/

ijkl.module('studiomanager', [], function () {
    "use strict";

    var api = ijkl('api');
    var ac = ijkl('autocomplete');
    var func = ijkl('function');

    var actualStudios = null;

    var VA_STR = 'V/A';

    var open = function (anchor, currentVal, callback, includeVAAndAllowCreation) {
        if (ac.isOpen()) {
            return;
        }
        var studios = func.toArray(actualStudios);
        if (includeVAAndAllowCreation) {
            studios.unshift(VA_STR);
        }
        ac(anchor, currentVal, function (newStudioName, onSuccess, onReject) {
            var proposedStudio;
            if (includeVAAndAllowCreation && newStudioName === VA_STR) {
                proposedStudio = 0;
            } else {
                proposedStudio = func.filter(actualStudios, function (name) {
                    return name === newStudioName;
                })[0] || -1;
            }
            if (proposedStudio < 0) {
                if (includeVAAndAllowCreation) {
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
                    alert("Such studio does not exist!");
                    onReject();
                }
            } else {
                callback(proposedStudio, onSuccess, onReject);
            }
        }, studios);
    };

    return {
        init: function () {
            return api('studio/list').then(function (json) {
                actualStudios = json;
            }, api.FATAL);
        },
        getStudio: function (id) {
            return id === 0 ? VA_STR : actualStudios[id];
        },
        open: open,
        VA_STR: VA_STR
    };
});