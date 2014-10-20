ijkl.module('app', ['promise', 'querySelector'], function() {
	var api = ijkl('sources');
	var data = api('clip/list');
	var ft = ijkl('flextable');
	var dom = ijkl('dom');
	return function() {
		var root = document.querySelector("#root");
		data.then(function(clips) {
			var tbody = dom('tbody', null);
			var table = dom('table', { className: ['table', 'table-striped', 'table-hover'], 'width': '100%' }, [dom('thead', null, dom('tr', null, [
				dom('th', null, 'Thumb'),
				dom('th', null, 'Name'),
				dom('th', null, 'Studio'),
				dom('th', null, 'Role'),
				dom('th', null, 'Grade'),
				dom('th', null, 'Race'),
				dom('th', null, 'Tags'),
				dom('th', null, 'Record'),
				dom('th', null, 'Duration')
			])), tbody]);
			var fta = ft(table);
			root.appendChild(table);
			clips.forEach(function(clip) {
				tbody.appendChild(fta([
					dom('td', null, clip.thumbSet),
					dom('td', null, clip.file),
					dom('td', null, clip.studio),
					dom('td', null, clip.role),
					dom('td', null, clip.grade),
					dom('td', null, clip.race),
					dom('td', null, clip.tags),
					dom('td', null, clip.record),
					dom('td', null, clip.duration)
				]));
			});
			console.log(0x4);
		});
	};
});
