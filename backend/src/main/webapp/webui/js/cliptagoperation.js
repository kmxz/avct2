/*global ijkl*/

ijkl.module('cliptagoperation', [], function () {
    "use strict";

    var api = ijkl('api');
    var asel = ijkl('actionselector');
    var canvas = ijkl('canvas');
    var po = ijkl('popover');
    var modal = ijkl('modal');
    var sfoo = ijkl('simplefileopeningoverlay');
    var tm = ijkl('tagmanager');

    var actualClips;

    var currentClipId = null;
    var currentTagId = null;
    var currentOnBestSetCallback = null;

    // modal

    var modalEl = document.getElementById('best-clip-of-tag');
    var oldG = document.getElementById('old-g');
    var oldT = document.getElementById('old-t');
    var oldI = document.getElementById('old-i').getContext('2d');
    var newG = document.getElementById('new-g');
    var newT = document.getElementById('new-t');
    var newI = document.getElementById('new-i').getContext('2d');
    var nullImg = new Image();
    nullImg.src = 'no-thumbnail.jpg';
    var cb = modalEl.querySelector(asel('cancel'));
    var sb = modalEl.querySelector(asel('update'));

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

    var loadImgToCover = function (img, ctx) {
        canvas.loadImgToCover(img, ctx, true);
    };

    var old; // old best clip

    var propose = function () {
        loadImgToCover(nullImg, oldI);
        old = tm.getTags[currentTagId].bestClip;
        if (old === currentClipId) {
            window.alert('It is already the best clip of tag!'); return;
        }
        if (old) {
            oldT.innerHTML = actualClips[old].file;
            if (actualClips[old].thumbImgPromise) {
                actualClips[old].thumbImgPromise.then(function (img) {
                    loadImgToCover(img, oldI);
                });
            }
        } else { oldT.innerHTML = '<i>[NO PREVIOUS CLIP]</i>'; }
        newT.innerHTML = actualClips[currentClipId].file;
        loadImgToCover(nullImg, newI);
        if (actualClips[currentClipId].thumbImgPromise) {
            actualClips[currentClipId].thumbImgPromise.then(function (img) {
                loadImgToCover(img, newI);
            });
        }
        modal.show(modalEl);
    };

    oldG.addEventListener('mouseenter', function () {
        sfoo.open(this, old, actualClips[old].path);
    });
    oldG.addEventListener('mouseleave', function () { sfoo.close(); });
    newG.addEventListener('mouseenter', function () {
        sfoo.open(this, currentClipId, actualClips[currentClipId].path);
    });
    newG.addEventListener('mouseleave', function () { sfoo.close(); });

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
        api('tag/setbest', {'id': currentTagId, 'clip': currentClipId}).then(function () {
            tm.notifyBestClipSet(currentTagId, currentClipId);
            currentOnBestSetCallback();
            unlock();
            modal.close();
        }, unlock);
    });

    // context menu

    var currentOnRemoveCallback = null;

    var operationDiv = document.getElementById('clip-tag-operation');
    operationDiv.querySelector(asel('remove')).addEventListener('click', function () {
        currentOnRemoveCallback();
    });
    operationDiv.querySelector(asel('setasbest')).addEventListener('click', function () {
        propose();
    });
    var sfo = po(operationDiv);

    // export

    return {
        close: function () { sfo.close(); },
        open: function (el, onRemove, onBestSet, clipId, tagId) {
            sfo(el);
            currentOnRemoveCallback = onRemove;
            currentOnBestSetCallback = onBestSet;
            currentClipId = clipId;
            currentTagId = tagId;
        },
        setClipsRef: function (clipsRef) {
            actualClips = clipsRef;
        }
    };
});
