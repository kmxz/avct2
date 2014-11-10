ijkl.module('renderers', [], function() {
    var dom = ijkl('dom');
    var empty = function(field) {
        return dom('span', { className: ['label', 'label-warning'] }, 'No ' + field + '!');
    };
    return {
        empty: empty,
        renderStudio: function(id, studios) {
            return studios[id];
        },
        renderThumb: function(id, thumbSet) {
            if (!thumbSet) {
                return empty('thumb');
            }
            return dom('img', { src: '/clip/' + id + '/thumb', className: 'clip-thumb' });
        },
        renderRole: function(roles) {
            if (!roles.length) {
                return empty('roles');
            }
            return roles.map(function(role) {
                return dom('a', { className: 'tag' }, role);
            });
        },
        renderTags: function(tagIdList, tags) {
            if (!tagIdList.length) {
                return empty('tags');
            }
            return tagIdList.map(function(tag) {
                return dom('a', { className: 'tag' }, tags[tag]['name']);
            });
        },
        renderGrade: function(num) {
            var list = [];
            for (var i = 1; i <= 5; i++) {
                list.push(dom('span', { className: ['glyphicon', i <= num ? 'glyphicon-star' : 'glyphicon-star-empty'] }));
            }
            return list;
        }
    };
});