ijkl.module('columndef', [], function() {

    var dom = ijkl('dom');
    var sm = ijkl('studiomanager');
    var tm = ijkl('tagmanager');

    var Column = function(className, text, renderer) {
        this.className = className;
        this.text = text;
        this.renderer = renderer;
    };
    Column.prototype.render = function(td, clip) {
        td.innerHTML = ''; // XXX: should we recreate a <td> to clear event listeners?
        this.renderer.call(clip, td);
    };
    Column.prototype.selector = function() {
        return 'td.' + this.className;
    };
    var empty = function(field) {
        return dom('span', { className: ['label', 'label-warning'] }, 'No ' + field + '!');
    };
    return {
        thumb: new Column('c-thumb', 'Thumb', function (td) {
            if (!this.thumbSet) {
                td.appendChild(empty('thumb'));
            } else {
                //td.appendChild(dom('img', {src: '/clip/' + this.id + '/thumb', className: 'clip-thumb'}));
            }
        }),
        file: new Column('c-file', 'Name', function (td) {
            dom.append(td, this.file);
        }),
        studio: new Column('c-studio', 'Studio', function (td) {
            dom.append(sm.getStudios()[this.studio]);
        }),
        role: new Column('c-role', 'Role', function (td) {
            if (!this.role.length) {
                td.appendChild(empty('roles'));
            } else {
                dom.append(td, this.role.map(function (role) {
                    return dom('a', {className: 'tag'}, role);
                }));
            }
        }),
        grade: new Column('c-grade', 'Grade', function (td) {
            if (this.grade <= 0) {
                td.appendChild(empty('grade'));
            } else {
                var list = [];
                for (var i = 1; i <= 5; i++) {
                    list.push(dom('span', {className: ['glyphicon', i <= this.grade ? 'glyphicon-star' : 'glyphicon-star-empty']}));
                }
                dom.append(td, list);
            }
        }),
        race: new Column('c-race', 'Race', function (td) {
            dom.append(td, this.race);
        }),
        tags: new Column('c-tags', 'Tags', function (td) {
            var tags = tm.getTags();
            if (!this.tags.length) {
                td.appendChild(empty('tags'));
            } else {
                dom.append(td, this.tags.map(function (tagId) {
                    var tag = tags[tagId];
                    var el = dom('a', {className: ['tag', 'removable'], title: "Click to remove"}, tag.name);
                    el.dataset.id = tag.id;
                    return el;
                }));
            }
        }),
        record: new Column('c-record', 'Record', function (td) {
            // TODO
        }),
        sourceNote: new Column('c-source-note', 'Source note', function (td) {
            dom.append(td, this.sourceNote);
        }),
        duration: new Column('c-duration', 'Duration', function (td) {
            dom.append(td, this.duration);
        }),
        size: new Column('c-size', 'Size', function (td) {
            dom.append(td, this.size);
        })
    }
});