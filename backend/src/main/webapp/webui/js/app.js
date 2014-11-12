"use strict";

ijkl.module('app', ['promise', 'classList', 'dataset', 'querySelector'], function() {
	var api = ijkl('api');
	var actualClips = null;
	var actualStudios = null;
	var init = function() {
		var as = ijkl('actionselector');
		var Clip = ijkl('clipobj'); // lazy load to avoid circular dependency
		var dom = ijkl('dom');
		var ft = ijkl('flextable');
		var func = ijkl('function');
		var tm = ijkl('tagmanager');
		var loaded = ijkl('loading');
		Promise.all([api('clip/list'), api('studio/list'), api('tag/list')]).then(function(results) {
			actualClips = func.map(results[0], function(json, id) {
				return new Clip(id, json);
			});
			actualStudios = results[1];
			tm.init(results[2]);
			var tbody = dom('tbody', null);
			var table = dom('table', { className: ['table', 'table-hover'], 'width': '100%' }, [dom('thead', null, dom('tr', null, [
				dom('th', { className: 'c-thumb' }, 'Thumb'),
				dom('th', { className: 'c-file' }, 'Name'),
				dom('th', { className: 'c-studio' }, 'Studio'),
				dom('th', { className: 'c-role' }, 'Role'),
				dom('th', { className: 'c-grade' }, 'Grade'),
				dom('th', { className: 'c-race' }, 'Race'),
				dom('th', { className: 'c-tags' }, 'Tags'),
				dom('th', { className: ['c-record', 'hidden'] }, 'Record'),
				dom('th', { className: ['c-duration', 'hidden'] }, 'Duration'),
				dom('th', { className: ['c-source-note', 'hidden'] }, 'Source note')
			])), tbody]);
			var ftt = ft(table);
			func.forEach(actualClips, function(clip) {
				var render = function(className, postProcess) {
					var td = dom('td', { className: className });
					postProcess(td);
					return td;
				};
				var tr = ftt.add([
					render('c-thumb', clip.renderThumb.bind(clip)),
					render('c-file', clip.renderName.bind(clip)),
					render('c-studio', function(td) { clip.renderStudio(td, actualStudios); }),
					render('c-role', clip.renderRole.bind(clip)),
					render('c-grade', clip.renderGrade.bind(clip)),
					render('c-race', function(td) { td.innerHTML = clip['race']; }),
					render('c-tags', function(td) { clip.renderTags(td, tm.getTags()); }),
					render(['c-record', 'hidden'], function(td) { td.innerHTML = clip['record']; }),
					render(['c-duration', 'hidden'], function(td) { td.innerHTML = clip['duration']; }),
					render(['c-source-note', 'hidden'], function(td) { td.innerHTML = clip['sourceNote']; })
				]);
				clip.setTr(tr);
				tbody.appendChild(tr);
			});
			document.getElementById("root").appendChild(table);
			document.querySelector(as('columns')).addEventListener('click', function() {
				ftt.columnSel();
			});
			document.querySelector(as('tags')).addEventListener('click', tm.open.bind(tm));
			loaded();
		}, api.FATAL);
	};
	init.getParentTr = function(el) {
		var cur = el;
		while (cur && cur.tagName !== 'TR') {
			cur = cur.parentNode;
		}
		if (cur) {
			return actualClips[cur.dataset.id];
		} else {
			return null;
		}
	};
	return init;
});
