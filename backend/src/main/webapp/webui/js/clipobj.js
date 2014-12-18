"use strict";

ijkl.module('clipobj', ['querySelector', 'dataset'], function () {

    var ac = ijkl('autocomplete');
    var api = ijkl('api');
    var as = ijkl('actionselector');
    var dom = ijkl('dom');
    var ed = ijkl('delegation');
    var func = ijkl('function');
    var modal = ijkl('modal');
    var po = ijkl('popover');
    var sm = ijkl('studiomanager');
    var tm = ijkl('tagmanager');

    var root = document.getElementById("root");
    var fileOverlay = document.getElementById('file-overlay');
    var actualClips = null;

    var reinitThenRerender = function (oldClip, json) {
        var id = oldClip.id;
        var tr = oldClip.tr;
        actualClips[id] = new Clip(json);
        actualClips[id].setTrAndRenderAll(tr);
    };

    var updateHelper = function (raw) {
        return function (el) {
            var clip = getParentTr(el);
            if (!clip) {
                return;
            } // not sure if this line is necessary (considering the header)
            var post = function (key, value, onSuccess, onReject) {
                api('clip/edit', {'id': clip.id, 'key': key, 'value': value}).then(function (json) {
                    if (onSuccess) {
                        onSuccess(json);
                    }
                    reinitThenRerender(clip, json); // TODO: maybe only rerender current td?
                }, function (error) {
                    if (onReject) {
                        onReject(error);
                    }
                    api.ALERT(error);
                });
            };
            raw(el, clip, post);
        };
    };

    var getParentTr = function (el) {
        var cur = dom.getParent(el, dom.match('tr[data-id]'));
        if (cur) {
            return actualClips[cur.dataset.id];
        } else {
            return null;
        }
    };

    var Column = function (className, text, renderer, initializer) {
        this.className = className;
        this.text = text;
        this.renderer = renderer;
        this.initializedUtilities = initializer ? initializer(dom.match(this.selector())) : null; // init event listeners and utility functions
    };
    Column.prototype.render = function (td, clip) {
        td.innerHTML = ''; // XXX: should we recreate a <td> to clear event listeners?
        this.renderer.call(clip, td, this.initializedUtilities);
    };
    Column.prototype.selector = function () {
        return 'td.' + this.className;
    };
    var empty = function (field) {
        return dom('span', {className: ['label', 'label-warning']}, 'No ' + field + '!');
    };
    var columns = {
        thumb: new Column('c-thumb', 'Thumb', function (td) {
            if (!this.thumbSet) {
                td.appendChild(empty('thumb'));
            } else {
                //td.appendChild(dom('img', {src: '/clip/' + this.id + '/thumb', className: 'clip-thumb'}));
            }
        }, function (domFilter) {
            // TODO
        }),
        file: new Column('c-file', 'Name', function (td) {
            dom.append(td, this.file);
        }, function (domFilter) {
            var fileOverlaySpan = fileOverlay.querySelector('code');
            var fileOverlayBtnGroup = fileOverlay.querySelector('.btn-group');
            var fo = po(fileOverlay);
            var foClose = function () {
                fileOverlayBtnGroup.classList.remove('open');
                fo.close();
            };
            fileOverlay.querySelector(as('open')).addEventListener('click', function () {
                api('clip/open', {"id": getParentTr(this)['id']});
            });
            fileOverlay.querySelector(as('folder')).addEventListener('click', function () {
                api('clip/folder', {"id": getParentTr(this)['id']});
            });
            fileOverlay.querySelector('.dropdown-toggle').addEventListener('click', function () {
                fileOverlayBtnGroup.classList.toggle('open');
            });
            ed.container(fileOverlay, 'click', dom.match(as('with')), function (el) {
                foClose();
                console.log(el.dataset.path);
            });
            ed.target(root, 'mouseover', domFilter, function (el) {
                fileOverlaySpan.innerHTML = getParentTr(el)['path'];
                fo(el);
            });
            ed.target(root, 'mouseout', domFilter, function () {
                foClose();
            });
        }),
        studio: new Column('c-studio', 'Studio', function (td) {
            dom.append(td, sm.getStudios()[this.studio]);
        }),
        role: new Column('c-role', 'Role', function (td) {
            if (!this.role.length) {
                td.appendChild(empty('roles'));
            } else {
                dom.append(td, this.role.map(function (role) {
                    return dom('a', {className: 'tag'}, role);
                }));
            }
        }, function (domFilter) {
            var reEl = document.getElementById('role-editor');
            var re = po(reEl);
            var allRoleInputs = func.toArray(reEl.querySelectorAll('input[type=checkbox]')).map(function (single) {
                return {value: single.nextSibling.textContent, element: single};
            });
            ed.container(root, 'click', domFilter, updateHelper(function (el, clip, post) {
                allRoleInputs.forEach(function (single) {
                    if (clip.role.indexOf(single.value) < 0) {
                        single.element.checked = false;
                    } else {
                        single.element.checked = true;
                    }
                });
                re(el, function (onSuccess, onReject) {
                    post('role', allInputs.filter(function (single) {
                        return single.element.checked;
                    }).map(function (single) {
                        return single.value;
                    }), onSuccess, onReject);
                });
            }));
        }),
        grade: new Column('c-grade', 'Grade', function (td) {
            if (this.grade <= 0) {
                td.appendChild(empty('grade'));
            } else {
                var list = [];
                var i, current;
                for (i = 1; i <= 5; i++) {
                    current = dom('span', {className: ['grade-star', 'glyphicon', i <= this.grade ? 'glyphicon-star' : 'glyphicon-star-empty']});
                    current.dataset.grade = i;
                    list.push(current);
                }
                dom.append(td, list);
            }
        }, function (domFilter) {
            ed.target(root, 'mouseover', dom.match('.grade-star'), updateHelper(function (el, clip, post) {
                var grade = parseInt(el.dataset.grade);
                var stars = el.parentNode.children;
                var i = 1;
                var cl;
                var icl = function (fill) {
                    cl = stars[i - 1].classList;
                    cl.remove(fill ? 'glyphicon-star-empty' : 'glyphicon-star');
                    cl.add(fill ? 'glyphicon-star' : 'glyphicon-star-empty');
                }
                if (grade >= clip.grade) {
                    for (; i <= clip.grade; i++) {
                        icl(true);
                        cl.remove('golden-star');
                    }
                    for (; i <= grade; i++) {
                        icl(true);
                        cl.add('golden-star');
                    }
                } else if (grade < clip.grade) {
                    for (; i <= grade; i++) {
                        icl(true);
                        cl.add('golden-star');
                    }
                    for (; i <= clip.grade; i++) {
                        icl(true);
                        cl.remove('golden-star');
                    }
                }
                for (; i <= 5; i++) {
                    icl(false);
                    cl.remove('golden-star');
                }
            }));
            ed.container(root, 'click', dom.match('.grade-star'), updateHelper(function (el, clip, post) {
                post('grade', el.dataset.grade);
            }));
            ed.target(root, "mouseout", domFilter, function (el) {
                cd.grade.render(el, getParentTr(el)); // clear golden stars
            });
        }),
        race: new Column('c-race', 'Race', function (td) {
            dom.append(td, this.race);
        }, function (domFilter) {
            var rsEl = document.getElementById('race-select');
            var rs = po(rsEl);
            var allRaceInputs = func.toArray(rsEl.querySelectorAll('input[type=radio]')).map(function (single) {
                return {value: single.nextSibling.textContent, element: single};
            });
            ed.container(root, 'click', domFilter, updateHelper(function (el, clip, post) {
                allRaceInputs.forEach(function (single) {
                    if (clip.role.indexOf(single.value) < 0) {
                        single.element.checked = false;
                    } else {
                        single.element.checked = true;
                    }
                });
                rs(el, function (onSuccess, onReject) {
                    post('race', allInputs.filter(function (single) {
                        return single.element.checked;
                    })[0].value, onSuccess, onReject);
                });
            }));
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
        }, function (domFilter) {
            ed.target(root, 'mouseover', domFilter, updateHelper(function (el, clip, post) {
                tm.selectTagOpen(el, function (newTagId, onSuccess, onReject) {
                    var proposed = clip.tags.concat([newTagId]);
                    post('tags', proposed, onSuccess, onReject);
                });
            }));
            ed.target(root, 'mouseout', domFilter, tm.selectTagClose);
            ed.container(root, 'click', dom.match('.tag.removable'), updateHelper(function (el, clip, post) {
                var td = dom.getParent(el, dom.match(cd.tags.selector()));
                if (window.confirm('Remove this tag from this clip\'s tag list?')) {
                    var proposed = clip.tags.filter(function (parentId) {
                        return parentId !== parseInt(el.dataset.id);
                    });
                    post('tags', proposed);
                }
            }));
        }),
        record: new Column('c-record', 'Record', function (td, daysFromNow) {
            if (!this.lastPlay || !this.totalPlay) {
                dom.append(td, 'Never');
            } else {
                dom.append(td, this.totalPlay + ' times (last: ' + daysFromNow(this.lastPlay) + ' days ago)');
            }
        }, function (domFilter) {
            var historyEl = document.getElementById('history');
            var historyTable = historyEl.querySelector('table');
            ed.container(root, 'click', domFilter, updateHelper(function (el, clip, post) {
                api("clip/history", {id: clip.id}).then(function (entries) {
                    // show history info
                    var tbody = dom('tbody', null, entries.map(function (date) {
                        var dateObj = new Date(date);
                        return dom('tr', null, dom('td', null, dateObj.toString()));
                    }));
                    var table = dom('table', {className: ['table', 'table-condensed', 'table-hover']}, tbody);
                    historyTable.parentNode.replaceChild(table, historyTable);
                    historyTable = table;
                    modal.show(historyEl)
                }, api.ALERT);
            }));
            return function (ts) {
                var diffSecs = new Date().getTime() / 1000 - ts;
                return Math.floor(diffSecs / (24 * 3600));
            };
        }),
        sourceNote: new Column('c-source-note', 'Source note', function (td) {
            dom.append(td, this.sourceNote);
        }),
        duration: new Column('c-duration', 'Duration', function (td, humanReadableDuration) {
            dom.append(td, humanReadableDuration(this.duration));
        }, function (domFilter) {
            ed.container(root, 'click', domFilter, updateHelper(function (el, clip, post) {
                ac(el, el.innerHTML, function (newValue, onSuccess, onReject) {
                    var hrtm = newValue.match(/^([0-9]+):([0-9]{2})$/);
                    if (!hrtm) {
                        window.alert("The number format is illegal!");
                        onReject();
                        return;
                    }
                    var realDuration = parseInt(hrtm[1]) * 60 + parseInt(hrtm[2]);
                    post('duration', realDuration, onSuccess, onReject)
                }, []);
            }));
            return function (duration) {
                var min = (duration % 60);
                if (min < 10) {
                    min = '0' + min;
                }
                return Math.floor(duration / 60) + ':' + min;
            };
        }),
        size: new Column('c-size', 'Size', function (td, humanReadableSize) {
            dom.append(td, humanReadableSize(this.size));
        }, function () {
            return function (size) {
                var units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
                var out = size;
                var index = 0;
                while (out >= 1000) {
                    out /= 1000;
                    index++;
                }
                return out.toPrecision(3) + units[index];
            };
        })
    };

    var Clip = function (json) { // XXX: this is ugly
        this.id = json['id'];

        this.duration = json['duration'];
        this.file = json['file'];
        this.grade = json['grade'];
        this.lastPlay = json['lastPlay'];
        this.path = json['path'];
        this.race = json['race'];
        this.role = json['role'];
        this.size = json['size'];
        this.sourceNote = json['sourceNote'];
        this.studio = json['studio'];
        this.tags = json['tags'];
        this.thumbSet = json['thumbSet'];
        this.totalPlay = json['totalPlay'];

        this.tr = null;
    };
    Clip.prototype.setTrAndRenderAll = function (tr) {
        this.tr = tr;
        tr.dataset.id = this.id;
        func.forEach(columns, function (column) {
            column.render(tr.querySelector(column.selector()), this);
        }.bind(this));
    };

    return {
        Clip: Clip,
        init: function (json, players) {
            actualClips = [];
            json.forEach(function (json) {
                actualClips[json['id']] = new Clip(json);
            });
            var menu = fileOverlay.querySelector('.dropdown-menu');
            menu.innerHTML = '';
            players.forEach(function (path) {
                var names = path.split(/\/|\\/g);
                var fileName = names[names.length - 1];
                var a = dom('a', {'href': as.get('with')}, fileName);
                a.dataset.path = path;
                dom.append(menu, dom('li', null, a));
            });
        },
        getClips: function () {
            return actualClips;
        },
        columns: columns
    };
});
