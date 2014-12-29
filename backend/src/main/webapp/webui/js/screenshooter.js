/*global ijkl*/

ijkl.module('screenshooter', ['querySelector', 'classList', 'bloburls'], function () {
    "use strict";

    var api = ijkl('api');
    var asel = ijkl('actionselector');
    var modal = ijkl('modal');

    var shooter = document.getElementById('screenshot');
    var canvasCtx = shooter.querySelector('canvas').getContext("2d");
    var cb = shooter.querySelector(asel('cancel'));
    var sb = shooter.querySelector(asel('save'));
    var ss = document.getElementById('startShot');

    var objectUrlIntern = (function () {
        var current = null;
        var revoke = function () {
            if (current) {
                window.URL.revokeObjectURL(current);
            }
        };
        return {
            add: function (response) {
                revoke();
                current = window.URL.createObjectURL(response);
                return current;
            },
            revoke: revoke
        };
    }());

    var close = function () {
        objectUrlIntern.revoke();
        modal.close();
    };

    var locked = false;
    var currentClipId;
    var currentToBeUpdated;

    var loadfit = function (url, isInit) {
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
        };
        image.onerror = function () {
            currentToBeUpdated = false;
            locked = false;
        };
        image.src = url;
    };

    cb.addEventListener('click', function () {
        if (locked) { return; }
        close();
    });

    sb.addEventListener('click', function () {
        if (locked) { return; }
        if (!currentToBeUpdated) {
            close();
            return;
        }
    });

    ss.addEventListener('click', function () {
        if (locked) { return; }
        locked = true;
        api('clip/shot', { 'id': currentClipId }).then(function (response) {
            loadfit(objectUrlIntern.add(response), false);
        }, api.ALERT);
    });

    var getUrl = function (clip) {
        return clip.thumbSet ? '/serv/clip/' + clip.id + '/thumb' : 'no-thumbnail.jpg';
    };

    var open = function (clip) {
        currentToBeUpdated = false;
        currentClipId = clip.id;
        locked = true;
        loadfit(getUrl(clip), true);
        modal.show(shooter);
    };

    open.getUrl = getUrl;

    return open;
});