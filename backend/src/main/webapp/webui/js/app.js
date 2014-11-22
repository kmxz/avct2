"use strict";

ijkl.module('app', ['promise', 'classList', 'dataset', 'querySelector'], function() {

	var api = ijkl('api');
	var as = ijkl('actionselector');
	var cd = ijkl('columndef');
	var clip = ijkl('clipobj');
	var dom = ijkl('dom');
	var ft = ijkl('flextable');
	var func = ijkl('function');
	var loaded = ijkl('loading');
	var pl = ijkl('players');
	var sm = ijkl('studiomanager');
	var tm = ijkl('tagmanager');

	return function() {
		Promise.all([api('clip/list'), pl.init(), sm.init(), tm.init()]).then(function(results) {
			clip.init(results[0]);
			var thead = dom('thead')
			var tbody = dom('tbody');
			var table = dom('table', { className: ['table', 'table-hover'], 'width': '100%' }, [thead, tbody]);
			var ftt = ft(table, func.toArray(cd));
			thead.appendChild(ftt.yieldThs());
			func.forEach(clip.getClips(), function(clip) {
				var tr = ftt.yieldTds();
				clip.setTrAndRenderAll(tr);
				tbody.appendChild(tr);
			});
			ftt.showColumn(cd.duration.className, false);
			ftt.showColumn(cd.size.className, false);
			document.getElementById("root").appendChild(table);
			document.querySelector(as('columns')).addEventListener('click', function() {
				ftt.columnSel();
			});
			document.querySelector(as('tags')).addEventListener('click', tm.open.bind(tm));
			loaded();
		}, api.FATAL);
	};
});
