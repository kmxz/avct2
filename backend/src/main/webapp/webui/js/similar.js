/*global ijkl*/

ijkl.module('similar', ['querySelector', 'dataset', 'es5Array'], function () {
    "use strict";

    var api = ijkl('api');
    var asel = ijkl('actionselector');
    var dom = ijkl('dom');
    var ed = ijkl('delegation');
    var func = ijkl('function');
    var modal = ijkl('modal');
    var po = ijkl('popover');

    var actualClips;

    var similarEl = document.getElementById('similar');
    var modalBody = similarEl.querySelector('.modal-body');
    var loadingMark = dom('p', null, "The page is being loaded.");
    var thead = dom('thead', null, dom('tr', null, [
        dom('th', null, 'File'),
        dom('th', null, 'Score')
    ]));

    var currentTargetClipId = null;

    var similarFileOverlay = document.getElementById('similar-file-overlay');
    var sfo = po(similarFileOverlay);
    similarFileOverlay.querySelector(asel('norecord')).addEventListener('click', function () {
        api('clip/open', {"id": currentTargetClipId, "record": false});
    });
    similarFileOverlay.querySelector(asel('folder')).addEventListener('click', function () {
        api('clip/folder', {"id": currentTargetClipId});
    });
    var fileOverlaySpan = similarFileOverlay.querySelector('#similar-filename');

    var similarScoreOverlay = document.getElementById('similar-score-overlay');
    var sso = po(similarScoreOverlay);
    var scoreTbody = similarScoreOverlay.querySelector('tbody');

    var main = function (clipId) {
        modalBody.replaceChild(loadingMark, modalBody.firstChild);
        modal.show(similarEl);
        api("clip/similar", {id: clipId}).then(function (entries) {
            var tbody = dom('tbody', null, entries.sort(function (e1, e2) {
                return e2.total - e1.total;
            }).map(function (entry) {
                var clip =  actualClips[entry.clipId];
                var fileTd = dom('td', null, clip.file);
                fileTd.addEventListener('mouseenter', function () {
                    currentTargetClipId = entry.clipId;
                    fileOverlaySpan.innerHTML = clip.path;
                    sfo(this);
                });
                fileTd.addEventListener('mouseleave', function () {
                    sfo.close();
                });
                var scoreTd = dom('td', null, entry.total.toFixed(3));
                scoreTd.addEventListener('mouseenter', function () {
                    scoreTbody.innerHTML = '';
                    dom.append(scoreTbody, func.toArray(func.map(entry.scores, function (score, key) {
                        return dom('tr', null, [dom('td', null, key), dom('td', null, score.toFixed(3))]);
                    })));
                    sso(this);
                });
                scoreTd.addEventListener('mouseleave', function () {
                    sso.close();
                });
                return dom('tr', null, [fileTd, scoreTd]);
            }));
            var table = dom('table', {className: ['table', 'table-condensed', 'table-hover']}, [thead, tbody]);
            table.style.tableLayout = 'fixed';
            modalBody.replaceChild(table, modalBody.firstChild);
        });
    };

    main.init = function (clips) {
        actualClips = clips;
    };

    return main;
});