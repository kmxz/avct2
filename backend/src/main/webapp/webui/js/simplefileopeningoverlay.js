/*global ijkl*/

ijkl.module('simplefileopeningoverlay', [], function () {
    "use strict";

    var api = ijkl('api');
    var asel = ijkl('actionselector');
    var po = ijkl('popover');

    var currentTargetClipId = null;

    var similarFileOverlay = document.getElementById('simple-file-opening-overlay');
    similarFileOverlay.querySelector(asel('record')).addEventListener('click', function () {
        api('clip/open', {"id": currentTargetClipId, "record": true});
    });
    similarFileOverlay.querySelector(asel('norecord')).addEventListener('click', function () {
        api('clip/open', {"id": currentTargetClipId, "record": false});
    });
    similarFileOverlay.querySelector(asel('folder')).addEventListener('click', function () {
        api('clip/folder', {"id": currentTargetClipId});
    });
    var fileOverlaySpan = similarFileOverlay.querySelector('#similar-filename');

    var sfo = po(similarFileOverlay);

    return {
        close: function () { sfo.close(); },
        open: function (el, id, text) {
            sfo(el);
            currentTargetClipId = id;
            fileOverlaySpan.innerHTML = text;
        }
    };
});