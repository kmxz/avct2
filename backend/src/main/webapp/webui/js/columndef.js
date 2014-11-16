ijkl.module('columndef', ['dataset'], function() {

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
    var daysFromNow = function(ts) {
        var diffSecs = new Date().getTime() / 1000 - ts;
        return diffSecs / (24 * 3600);
    };
    var humanReadableSize = function(size) {
        var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
        var out = size;
        var index = 0;
        while (out >= 1000) {
            out /= 1000;
            index++;
        }
        return out.toPrecision(3) + units[index];
    };
    var humanReadableDuration = function(duration) {
        var min = (duration % 60);
        if (min < 10) { min = '0' + min; }
        return Math.floor(duration / 60) + ':' + min;
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
                    return dom('a', { className: 'tag' }, role);
                }));
            }
        }),
        grade: new Column('c-grade', 'Grade', function (td) {
            if (this.grade <= 0) {
                td.appendChild(empty('grade'));
            } else {
                var list = [];
                var i, current;
                for (i = 1; i <= 5; i++) {
                    current = dom('span', { className: ['grade-star', 'glyphicon', i <= this.grade ? 'glyphicon-star' : 'glyphicon-star-empty'] });
                    current.dataset.grade = i;
                    list.push(current);
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
            if (!this.lastPlay || !this.totalPlay) {
                dom.append(td, 'Never');
            } else {
                dom.append(td, this.totalPlay + ' times (last:' + daysFromNow(this.lastPlay) + ' days ago)');
            }
        }),
        sourceNote: new Column('c-source-note', 'Source note', function (td) {
            dom.append(td, this.sourceNote);
        }),
        duration: new Column('c-duration', 'Duration', function (td) {
            dom.append(td, humanReadableDuration(this.duration));
        }),
        size: new Column('c-size', 'Size', function (td) {
            dom.append(td, humanReadableSize(this.size));
        })
    }
});