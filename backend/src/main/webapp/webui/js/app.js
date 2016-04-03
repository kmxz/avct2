/*global ijkl*/

ijkl.module('app', ['promise', 'classList', 'dataset', 'querySelector'], function () {
    "use strict";

    var api = ijkl('api');
    var asel = ijkl('actionselector');
    var clip = ijkl('clipobj');
    var dom = ijkl('dom');
    var ed = ijkl('delegation');
    var extable = ijkl('extable');
    var ft = ijkl('flextable');
    var func = ijkl('function');
    var loaded = ijkl('loading');
    var modal = ijkl('modal');
    var sm = ijkl('studiomanager');
    var tm = ijkl('tagmanager');
    var qjmodal = ijkl('quickjerkmodal');
    var qjmech = ijkl('quickjerkmechanism');

    var cd = clip.columns;

    return function () {
        ed.container(document.body, 'submit', dom.match('form'), function (el, event) {
            event.preventDefault(); // to prevent forms get submitted when enter key pressed
        });
        loaded.appendThen("Script loaded...", function () {
            Promise.all([api('clip/list'), api('players'), sm.init(), tm.init()]).then(function (results) {
                clip.init(results[0], results[1]);
                api('clip/autocrawl').then(function (changes) {
                    if ((!changes.added.length) && (!changes.disappeared.length)) {
                        return;
                    }
                    var modalContainer = document.getElementById('crawl-report');
                    var modalBody = modalContainer.querySelector('.modal-body');
                    if (changes.added.length) {
                        modalBody.appendChild(dom('h4', {className: 'modal-title'}, 'New clips found'));
                        modalBody.appendChild(dom('table', {className: ['table', 'table-condensed', 'table-hover']}, dom('tbody', null, changes.added.map(function (clip) {
                            return dom('tr', null, dom('td', null, clip));
                        }))));
                    }
                    if (changes.disappeared.length) {
                        modalBody.appendChild(dom('h4', {className: 'modal-title'}, 'Clips disappeared'));
                        modalBody.appendChild(dom('table', {className: ['table', 'table-condensed', 'table-hover']}, dom('tbody', null, changes.disappeared.map(function (clip) {
                            return dom('tr', null, dom('td', null, clip));
                        }))));
                        func.toArray(clip.getClips).filter(function (clip) {
                            return changes.disappeared.indexOf(clip.path) >= 0;
                        }).forEach(function (clip) {
                            clip.fileExists = false;
                        });
                    }
                    modal.show(modalContainer);
                }, api.FATAL);
                document.getElementById('total-clips').innerHTML = results[0].length;
                loaded.appendThen("Clips loaded. Rendering...", function () {
                    var root = document.getElementById("root");
                    var thead = dom('thead');
                    var tbody = dom('tbody');
                    var table = dom('table', {
                        className: ['table', 'table-hover'],
                        'width': '100%'
                    }, [thead, tbody]);
                    var ext = extable(tbody, root);
                    var ftt = ft(table, func.toArray(cd), ext);
                    thead.appendChild(ftt.yieldThs());
                    func.forEach(clip.getClips, function (clip) {
                        var tr = ftt.yieldTds();
                        clip.setTrAndRender(tr);
                        ext.pool.push(tr);
                    });
                    ftt.showColumn(cd.duration.className, false);
                    ftt.showColumn(cd.size.className, false);
                    root.appendChild(table);
                    document.querySelector(asel('columns')).addEventListener('click', function () {
                        ftt.columnSel();
                    });
                    document.querySelector(asel('tags')).addEventListener('click', tm.open.bind(tm));
                    document.getElementById('quickjerk-btn').addEventListener('click', qjmodal.show);
                    qjmech.init(ext);
                    qjmodal.init();
                    loaded();
                    ext.reRender();
                });
            }, api.FATAL);
        });
    };
});
