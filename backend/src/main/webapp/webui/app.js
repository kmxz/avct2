ijkl.module('app', ['promise', 'classList'], function() {
	var api = ijkl('sources');
	var ft = ijkl('flextable');
	var dom = ijkl('dom');
	var func = ijkl('function');
	var as = ijkl('actionselector');
	var renderers = ijkl('renderers');
	var pClips = api('clip/list');
	var pStudios = api('studio/list');
	var pTags = api('tag/list');
	return function() {
		var root = document.getElementById("root");
		Promise.all([pClips, pStudios, pTags]).then(function(results) {
			console.log("Clip information loading finished!");
			var tbody = dom('tbody', null);
			var table = dom('table', { className: ['table', 'table-hover'], 'width': '100%' }, [dom('thead', null, dom('tr', null, [
				dom('th', { className: 'col-thumb' }, 'Thumb'),
				dom('th', { className: 'col-file' }, 'Name'),
				dom('th', { className: 'col-studio' }, 'Studio'),
				dom('th', { className: 'col-role' }, 'Role'),
				dom('th', { className: 'col-grade' }, 'Grade'),
				dom('th', { className: 'col-race' }, 'Race'),
				dom('th', { className: 'col-tags' }, 'Tags'),
				dom('th', { className: ['hidden', 'col-record'] }, 'Record'),
				dom('th', { className: ['hidden', 'col-duration'] }, 'Duration'),
				dom('th', { className: ['hidden', 'col-source-note'] }, 'Source note')
			])), tbody]);
			var ftt = ft(table);
			root.appendChild(table);
			results[0].forEach(function(clip) {
				if (Math.random() > 0.03) { return; }
				tbody.appendChild(ftt.add([
					dom('td', { className: 'col-thumb' }, clip['thumbSet']),
					dom('td', { className: 'col-file' }, clip['file']),
					dom('td', { className: 'col-studio' }, renderers.renderStudio(clip['studio'], results[1])),
					dom('td', { className: 'col-role' }, renderers.renderRole(clip['role'])),
					dom('td', { className: 'col-grade' }, clip['grade']),
					dom('td', { className: 'col-race' }, clip['race']),
					dom('td', { className: 'col-tags' }, renderers.renderTags(clip['tags'], results[2])),
					dom('td', { className: ['hidden', 'col-record'] }, clip['record']),
					dom('td', { className: ['hidden', 'col-duration'] }, clip['duration']),
					dom('td', { className: ['hidden', 'col-source-note'] }, clip['sourceNote'])
				]));
			});
			console.log("Clips layouting finished!");
			document.querySelector(as('columns')).addEventListener('click', function() {
				console.log('!');
				ftt.columnSel();
			});
		});
	};


});
