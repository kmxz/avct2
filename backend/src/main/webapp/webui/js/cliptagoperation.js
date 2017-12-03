/*global ijkl*/

ijkl.module('cliptagoperation', [], function () {
    "use strict";

    var api = ijkl('api');
    var asel = ijkl('actionselector');
    var po = ijkl('popover');

    var currentOnRemoveCallback = null;
    var currentClipId = null;
    var currentTagId = null;

    var operationDiv = document.getElementById('clip-tag-operation');
    operationDiv.querySelector(asel('remove')).addEventListener('click', function () {
        currentOnRemoveCallback();
    });
    operationDiv.querySelector(asel('setasbest')).addEventListener('click', function () {
        window.alert('Setting ' + currentClipId + ' as best clip of tag ' + currentTagId '? Feature under development.');
    });
    var sfo = po(operationDiv);

    return {
        close: function () { sfo.close(); },
        open: function (el, onRemove, clipId, tagId) {
            sfo(el);
            currentOnRemoveCallback = onRemove;
            currentClipId = clipId;
            currentTagId = tagId;
        }
    };
});