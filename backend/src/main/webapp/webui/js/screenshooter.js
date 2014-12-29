/*global ijkl*/

ijkl.module('screenshooter', ['querySelector', 'classList', 'bloburls'], function () {
    "use strict";

    var api = ijkl('api');
    var asel = ijkl('actionselector');
    var func = ijkl('function');
    var modal = ijkl('modal');

    var shooter = document.getElementById('screenshot');
    var canvasCtx = shooter.querySelector('canvas').getContext("2d");
    var cb = shooter.querySelector(asel('cancel'));
    var sb = shooter.querySelector(asel('save'));
    var ss = document.getElementById('startShot');
    var fi = document.getElementById('fileInput');

    var locked = false;
    var currentClipId;
    var currentToBeUpdated;

    var loadfit = function (url, isInit, finallyCallback) {
        var image = new Image();
        image.onload = function () {
            var w = image.width;
            var h = image.height;
            var sw = w;
            var sh = h;
            var sx = 0;
            var sy = 0;
            if (w > h * 1.5) { // too wide
                sw = h * 1.5;
                sx = (w - sw) / 2;
            } else { // too high
                sh = w * 2 / 3;
                sy = (h - sh) / 2;
            }
            canvasCtx.drawImage(image, sx, sy, sw, sh, 0, 0, 300, 200);
            if (!isInit) {
                currentToBeUpdated = true;
            }
            locked = false;
            finallyCallback();
        };
        image.onerror = function () {
            currentToBeUpdated = false;
            locked = false;
            finallyCallback();
        };
        image.src = url;
    };

    cb.addEventListener('click', function () {
        if (locked) {
            return;
        }
        modal.close();
    });

    sb.addEventListener('click', function () {
        if (locked) {
            return;
        }
        if (!currentToBeUpdated) {
            modal.close();
            return;
        }
    });

    ss.addEventListener('click', function () {
        if (locked) {
            return;
        }
        locked = true;
        api('clip/shot', {'id': currentClipId}).then(function (response) {
            var url = window.URL.createObjectURL(response);
            loadfit(url, false, function () {
                window.URL.revokeObjectURL(url);
            });
        }, api.ALERT);
    });

    fi.addEventListener('change', function () {
        var fr = new FileReader();
        fr.onload = function (fe) {
            loadfit(fe.target.result, false, func.doNothing);
        };
        fr.readAsDataURL(fi.files[0]);
    });

    var getUrl = function (clip) {
        return clip.thumbSet ? '/serv/clip/' + clip.id + '/thumb' : 'no-thumbnail.jpg';
    };

    var open = function (clip) {
        currentToBeUpdated = false;
        currentClipId = clip.id;
        locked = true;
        loadfit(getUrl(clip), true, func.doNothing);
        modal.show(shooter);
    };

    open.getUrl = getUrl;

    return open;
});