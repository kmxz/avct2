ijkl.module('renderers', [], function() {
    var dom = ijkl('dom');
    return {
        renderStudio: function(id, studios) {
            return studios[id];
        },
        renderRole: function(roles) {
            if (!roles.length) {
                return dom('span', { className: ['alert', 'alert-warning'] }, 'No roles!');
            }
            return roles.map(function(role) {
                return dom('a', { className: 'tag' }, role);
            });
        },
        renderTags: function(tagIdList, tags) {
            if (!tagIdList.length) {
                return dom('span', { className: ['alert', 'alert-warning'] }, 'No tags!')
            }
            return tagIdList.map(function(tag) {
                return dom('a', { className: 'tag' }, tags[tag]['name']);
            });
        }
    };
});