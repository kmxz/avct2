/*global ijkl*/

ijkl.module('screenshooter', ['querySelector', 'classList', 'toBlob'], function () {
    "use strict";

    var api = ijkl('api');
    var asel = ijkl('actionselector');
    var modal = ijkl('modal');
    var canvas = ijkl('canvas');

    var shooter = document.getElementById('screenshot');
    var canvasCtx = shooter.querySelector('canvas').getContext("2d");
    var cb = shooter.querySelector(asel('cancel'));
    var sb = shooter.querySelector(asel('save'));
    var ss = document.getElementById('startShot');
    var fi = document.getElementById('fileInput');

    var currentToBeUpdated;
    var currentCallbackOnConfirm;
    var currentClip;

    var voidImage = new Image();
    voidImage.src = 'no-thumbnail.jpg'; // we assume this to be loaded before usage

    var locked = false;

    var lock = function () {
        locked = true;
        cb.classList.add('disabled');
        sb.classList.add('disabled');
    };

    var unlock = function () {
        locked = false;
        cb.classList.remove('disabled');
        sb.classList.remove('disabled');
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
        canvasCtx.canvas.toBlob(function (blob) {
            api('clip/saveshot', {'id': currentClip.id, 'file': blob}).then(function () {
                currentClip.thumbSet = true;
                currentCallbackOnConfirm();
                modal.close();
            }, unlock);
        });
    });

    var imgOnLoadInit = function () {
        canvas.loadImgToCover(this, canvasCtx);
        unlock();
    };

    var imgOnLoad = function () {
        imgOnLoadInit.call(this);
        currentToBeUpdated = true;
    };

    ss.addEventListener('click', function () {
        if (locked) {
            return;
        }
        lock();
        api('clip/shot', {'id': currentClip.id}).then(function (response) {
            api.loadImage(response, imgOnLoad, unlock);
        });
    });

    fi.addEventListener('change', function () {
        var fr = new FileReader();
        fr.onload = function (fe) {
            var url = fe.target.result;
            var img = new Image();
            img.onload = imgOnLoad;
            img.onerror = unlock;
            img.src = url;
        };
        fr.readAsDataURL(fi.files[0]);
    });

    var open = function (clip, callback) {
        currentToBeUpdated = false;
        currentClip = clip;
        currentCallbackOnConfirm = callback;
        lock();
        if (clip.thumbSet) {
            api('clip/thumb', {'id': currentClip.id}).then(function (response) {
                api.loadImage(response, imgOnLoadInit, unlock);
            });
        } else {
            canvas.loadImgToCover(voidImage, canvasCtx);
            unlock();
        }
        modal.show(shooter);
    };

    return open;
});