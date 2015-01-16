/*global ijkl*/

ijkl.module('app', ['promise', 'classList', 'dataset', 'querySelector'], function () {
    "use strict";

    var api = ijkl('api');
    var asel = ijkl('actionselector');
    var clip = ijkl('clipobj');
    var dom = ijkl('dom');
    var ft = ijkl('flextable');
    var func = ijkl('function');
    var loaded = ijkl('loading');
    var pl = ijkl('players');
    var sm = ijkl('studiomanager');
    var tm = ijkl('tagmanager');
    var qjmodal = ijkl('quickjerkmodal');
    var qjmech = ijkl('quickjerkmechanism');

    var cd = clip.columns;

    return function () {
        loaded.appendThen("Script loaded...", function () {
            api('clip/autocrawl').then(function (newClips) {
                loaded.appendThen("New clips scanned: " + (newClips.length ? newClips.join(', ') : "none"), function () {
                    Promise.all([api('clip/list'), api('players'), pl.init(), sm.init(), tm.init()]).then(function (results) {
                        clip.init(results[0], results[1]);
                        document.getElementById('total-clips').innerHTML = results[0].length;
                        loaded.appendThen("Rendering...", function () {
                            var thead = dom('thead');
                            var tbody = dom('tbody');
                            var table = dom('table', {
                                className: ['table', 'table-hover'],
                                'width': '100%'
                            }, [thead, tbody]);
                            var ftt = ft(table, func.toArray(cd));
                            thead.appendChild(ftt.yieldThs());
                            func.forEach(clip.getClips(), function (clip) {
                                var tr = ftt.yieldTds();
                                clip.setTrAndRender(tr);
                                tbody.appendChild(tr);
                            });
                            ftt.showColumn(cd.duration.className, false);
                            ftt.showColumn(cd.size.className, false);
                            qjmech.init(tbody);
                            document.getElementById("root").appendChild(table);
                            document.querySelector(asel('columns')).addEventListener('click', function () {
                                ftt.columnSel();
                            });
                            document.querySelector(asel('tags')).addEventListener('click', tm.open.bind(tm));
                            qjmodal.init();
                            document.getElementById('quickjerk-btn').addEventListener('click', qjmodal.show);
                            loaded();
                        });
                    }, api.FATAL);
                });
            }, api.ALERT);
        });
    };
});
