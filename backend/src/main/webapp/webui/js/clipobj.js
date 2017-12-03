/*global ijkl*/

ijkl.module('clipobj', ['querySelector', 'dataset', 'es5Array'], function () {
    "use strict";

    var ac = ijkl('autocomplete');
    var api = ijkl('api');
    var asel = ijkl('actionselector');
    var cto = ijkl('cliptagoperation');
    var dom = ijkl('dom');
    var ed = ijkl('delegation');
    var func = ijkl('function');
    var modal = ijkl('modal');
    var po = ijkl('popover');
    var sm = ijkl('studiomanager');
    var ss = ijkl('screenshooter');
    var tm = ijkl('tagmanager');
    var similar = ijkl('similar');

    var root = document.getElementById("root");
    var fileOverlay = document.getElementById('file-overlay');
    var actualClips = {};
    var quickJerkScoreUpdater = func.doNothing;
    tm.setClipsRef(actualClips);
    similar.init(actualClips);

    var Clip = function (json) { // XXX: this is ugly
        ['id', 'duration', 'grade', 'lastPlay', 'path', 'race', 'role', 'size', 'sourceNote', 'studio', 'tags', 'thumbSet', 'totalPlay', 'resolution'].forEach(function (key) {
            this[key] = json[key];
        }.bind(this));
        this.file = this.path.split('/').pop();
        this.fileExists = true; // by default set to true, unless later reset
        this.jerkScore = 0;
        this.jerkEntries = [];
        this.tr = null;
    };

    var getParentTr = function (el) {
        var cur = dom.getParent(el, dom.match('tr[data-id]'));
        return cur ? actualClips[cur.dataset.id] : null;
    };

    var reinitThenRerender = function (oldClip, json, opt_columnToUpdate) {
        var id = oldClip.id;
        var tr = oldClip.tr;
        actualClips[id] = new Clip(json);
        actualClips[id].setTrAndRender(tr, opt_columnToUpdate);
        return actualClips[id]; // return the new clip
    };

    var updateHelper = function (raw, opt_columnToUpdate) { // all columns will be rerendered if not given opt_columnToUpdate
        return function (el) {
            var clip = getParentTr(el);
            if (!clip) {
                return;
            } // not sure if this line is necessary (considering the <thead>)
            var post = function (key, value, onSuccess, onReject) {
                api('clip/edit', {'id': clip.id, 'key': key, 'value': value}).then(function (json) {
                    if (onSuccess) {
                        onSuccess(json);
                    }
                    var newClip = reinitThenRerender(clip, json, opt_columnToUpdate);
                    quickJerkScoreUpdater(newClip);
                }, function (error) {
                    if (onReject) {
                        onReject(error);
                    }
                });
            };
            raw(el, clip, post);
        };
    };

    var Column = function (className, text, renderer, initializer, opt_isVoid, opt_renderWhenVoid) {
        this.className = className;
        this.text = text;
        this.renderer = renderer;
        this.initializedUtilities = initializer ? initializer.call(this, dom.match(this.selector())) : null; // init event listeners and utility functions
        this.isVoid = opt_isVoid || function () { return false; };
        this.renderWhenVoid =  opt_renderWhenVoid || false;
    };
    Column.prototype.render = function (td, clip) {
        td.innerHTML = ''; // XXX: should we recreate a <td> to clear event listeners?
        var isVoid = this.isVoid(clip); // XXX
        if (this.renderWhenVoid || !isVoid) {
            this.renderer.call(clip, td, this.initializedUtilities);
        }
        if (isVoid) {
            td.appendChild(this.empty());
        }
    };
    Column.prototype.selector = function () {
        return 'td.' + this.className;
    };
    Column.prototype.empty = function () {
        return dom('span', {className: ['label', 'label-warning']}, this.text + ' is void!');
    };

    var columns = {
        thumb: new Column('c-thumb', 'Thumb', function (td) {
            api('clip/thumb', {"id": this.id}).then(function (response) {
                var img = api.loadImage(response);
                img.className = 'clip-thumb';
                td.innerHTML = '';
                td.appendChild(img);
            });
        }, function (domFilter) {
            var thisColumn = this;
            ed.container(root, 'click', domFilter, function (el) {
                var clip = getParentTr(el);
                ss(clip, function () {
                    clip.renderColumn(thisColumn);
                });
            });
        }, function (clip) {
            return !clip.thumbSet;
        }),
        file: new Column('c-file', 'Name', function (td) {
            dom.append(td, [
                dom('span', {className: 'resolution-indicator', style: {backgroundColor: this.resolution ? 'hsl(' + (Math.pow(Math.min(Math.max(0, (this.resolution - 160)) / 1280, 1), 2 / 3) * 120) + ', 100%, 50%)' : '#000'}}),
                this.file
            ]);
        }, function (domFilter) {
            var fileOverlaySpan = fileOverlay.querySelector('#filename');
            var fileOverlayBtnGroup = fileOverlay.querySelector('.btn-group');
            var existsGroup = document.getElementById('content-when-file-exists');
            var notExistsGroup = document.getElementById('content-when-file-not-exists');
            var fo = po(fileOverlay);
            var foClose = function () {
                fileOverlayBtnGroup.classList.remove('open');
                fo.close();
            };
            fileOverlay.querySelector(asel('open')).addEventListener('click', function () {
                api('clip/open', {"id": getParentTr(this).id, "record": true});
            });
            fileOverlay.querySelector(asel('norecord')).addEventListener('click', function () {
                api('clip/open', {"id": getParentTr(this).id, "record": false});
            });
            fileOverlay.querySelector(asel('folder')).addEventListener('click', function () {
                api('clip/folder', {"id": getParentTr(this).id});
            });
            fileOverlay.querySelector(asel('delete')).addEventListener('click', function () {
                var id = getParentTr(this).id;
                api('clip/delete', {"id": id}).then(function () {
                    var tr = actualClips[id].tr;
                    tr.parentNode.removeChild(tr); // step 1: remove the element
                    delete actualClips[id]; // step 2: remove the clip
                    var tcel = document.getElementById('total-clips');
                    tcel.innerHTML = parseInt(tcel.innerHTML, 10) - 1; // step 3: update the total count displayed (XXX: not graceful!)
                    var scel = document.getElementById('shown-clips');
                    scel.innerHTML = parseInt(scel.innerHTML, 10) - 1; // step 4: update the count displayed by QuickJerk (XXX: not graceful!)
                });
            });
            fileOverlay.querySelector('.dropdown-toggle').addEventListener('click', function () {
                fileOverlayBtnGroup.classList.toggle('open');
            });
            ed.container(fileOverlay, 'click', dom.match(asel('with')), function (el) {
                api('clip/openwith', {"id": getParentTr(el).id, "player": el.dataset.path}).then(func.doNothing);
                foClose();
            });
            ed.container(root, 'click', dom.match('.resolution-indicator'), function (el) {
                modal.show(document.getElementById('resolution'));
            });
            ed.target(root, 'mouseover', domFilter, function (el) {
                var clip = getParentTr(el);
                fileOverlaySpan.innerHTML = clip.path;
                existsGroup.style.display = clip.fileExists ? '' : 'none';
                notExistsGroup.style.display = clip.fileExists ? 'none' : '';
                fo(el);
            });
            ed.target(root, 'mouseout', domFilter, foClose);
            // similar file
            fileOverlay.querySelector(asel('similar')).addEventListener('click', function () {
                similar(getParentTr(this).id);
            });
        }, function (clip) {
            return !clip.fileExists;
        }, true),
        studio: new Column('c-studio', 'Studio', function (td) {
            dom.append(td, sm.getStudio(this.studio));
        }, function (domFilter) {
            ed.container(root, 'click', domFilter, updateHelper(function (el, clip, post) {
                sm.open(el, sm.getStudio(clip.studio) || '', function (proposedStudio, onSuccess, onReject) {
                    post('studio', proposedStudio, onSuccess, onReject);
                }, true);
            })); // update all columns!
        }, function (clip) {
            return (typeof clip.studio !== 'number');
        }),
        role: new Column('c-role', 'Role', function (td) {
            dom.append(td, this.role.map(function (role) {
                return dom('a', {className: 'tag'}, role);
            }));
        }, function (domFilter) {
            var reEl = document.getElementById('role-editor');
            var re = po(reEl);
            var allRoleInputs = func.toArray(reEl.querySelectorAll('input[type=checkbox]')).map(function (single) {
                return {value: single.nextSibling.textContent.trim(), element: single};
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
                    post('role', allRoleInputs.filter(function (single) {
                        return single.element.checked;
                    }).map(function (single) {
                        return single.value;
                    }), onSuccess, onReject);
                });
            }, this));
        }, function (clip) {
            return !clip.role.length;
        }),
        grade: new Column('c-grade', 'Grade', function (td) {
            var list = [];
            var i, current;
            for (i = 1; i <= 5; i++) {
                current = dom('span', {className: ['grade-star', 'glyphicon', i <= this.grade ? 'glyphicon-star' : 'glyphicon-star-empty']});
                current.dataset.grade = i;
                list.push(current);
            }
            dom.append(td, list);
        }, function (domFilter) {
            ed.target(root, 'mouseover', dom.match('.grade-star'), function (el) {
                var clip = getParentTr(el);
                var grade = parseInt(el.dataset.grade, 10);
                var stars = el.parentNode.children;
                var i = 1;
                var cl;
                var icl = function (fill) {
                    cl = stars[i - 1].classList;
                    cl.remove(fill ? 'glyphicon-star-empty' : 'glyphicon-star');
                    cl.add(fill ? 'glyphicon-star' : 'glyphicon-star-empty');
                };
                if (grade >= clip.grade) {
                    for (null; i <= clip.grade; i++) {
                        icl(true);
                        cl.remove('golden-star');
                    }
                    for (null; i <= grade; i++) {
                        icl(true);
                        cl.add('golden-star');
                    }
                } else if (grade < clip.grade) {
                    for (null; i <= grade; i++) {
                        icl(true);
                        cl.add('golden-star');
                    }
                    for (null; i <= clip.grade; i++) {
                        icl(true);
                        cl.remove('golden-star');
                    }
                }
                for (null; i <= 5; i++) {
                    icl(false);
                    cl.remove('golden-star');
                }
            });
            ed.container(root, 'click', dom.match('.grade-star'), updateHelper(function (el, clip, post) {
                post('grade', el.dataset.grade);
            }, this));
            ed.target(root, "mouseout", domFilter, function (el) {
                this.render(el, getParentTr(el)); // clear golden stars
            }.bind(this));
        }, function (clip) {
            return clip.grade <= 0;
        }, true),
        race: new Column('c-race', 'Race', function (td) {
            dom.append(td, this.race);
        }, function (domFilter) {
            var rsEl = document.getElementById('race-select');
            var rs = po(rsEl);
            var allRaceInputs = func.toArray(rsEl.querySelectorAll('input[type=radio]')).map(function (single) {
                return {value: single.nextSibling.textContent.trim(), element: single};
            });
            ed.container(root, 'click', domFilter, updateHelper(function (el, clip, post) {
                allRaceInputs.forEach(function (single) {
                    if (clip.race !== single.value) {
                        single.element.checked = false;
                    } else {
                        single.element.checked = true;
                    }
                });
                rs(el, function (onSuccess, onReject) {
                    var selected = allRaceInputs.filter(function (single) {
                        return single.element.checked;
                    });
                    if (!selected.length) { return; }
                    post('race', selected[0].value, onSuccess, onReject);
                });
            }, this));
        }, function (clip) {
            return clip.race === 'Unknown'; // XXX
        }),
        tags: new Column('c-tags', 'Tags', function (td) {
            var tags = tm.getTags;
            dom.append(td, this.tags.map(function (tagId) {
                var tag = tags[tagId];
                var props = {className: ['tag', 'removable']};
                if (tag.bestClip === this.id) {
                    props.className.push('best');
                    props.title = 'Best clip of tag';
                }
                var el = dom('a', props, tag.name);
                el.dataset.id = tag.id;
                return el;
            }.bind(this)));
        }, function (domFilter) {
            var checkIfCanContinue = function (proposed) {
                var tags = tm.getTags;
                var warnings = proposed.map(function (tagId) { return tags[tagId]; }).filter(function (tag) {
                    return tag.children.length && tag.children.every(function (child) { return proposed.indexOf(child.id) < 0; });
                }).map(function (tag) { return tag.name; });
                return warnings.length ? window.confirm("Tag(s) " + warnings.join(", ") + " has no child tags selected! Continue?") : true;
            };
            ed.target(root, 'mouseover', domFilter, updateHelper(function (el, clip, post) {
                tm.selectTagOpen(el, function (newTagId, onSuccess, onReject) {
                    var proposed = clip.tags.concat([newTagId]);
                    if (checkIfCanContinue(proposed)) {
                        post('tags', proposed, onSuccess, onReject);
                    } else {
                        onReject();
                    }
                });
            }, this));
            ed.target(root, 'mouseout', domFilter, tm.selectTagClose);
            ed.target(root, 'mouseover', dom.match('.tag'), updateHelper(function (el, clip, post) {
                var tagId = parseInt(el.dataset.id, 10);
                cto.open(el, function () {
                    if (window.confirm('Remove this tag from the clip\'s tag list?')) {
                        var proposed = clip.tags.filter(function (parentId) {
                            return parentId !== tagId;
                        });
                        if (checkIfCanContinue(proposed)) {
                            post('tags', proposed);
                        }
                    }
                }, clip.id, tagId);
            }));
            ed.target(root, 'mouseout', dom.match('.tag'), cto.close);
        }, function (clip) {
            return !clip.tags.length;
        }),
        record: new Column('c-record', 'Record', function (td, daysFromNow) {
            if (!this.lastPlay || !this.totalPlay) {
                dom.append(td, 'Never');
            } else {
                dom.append(td, this.totalPlay + ' times (last: ' + daysFromNow(this.lastPlay) + ' days ago)');
            }
        }, function (domFilter) {
            var historyEl = document.getElementById('history');
            var modalBody = historyEl.querySelector('.modal-body');
            var loadingMark = dom('p', null, "The page is being loaded.");
            var yyyymmdd = function (dateSec) {
                var zerofill = function (num) { return ('0' + num).slice(-2); }
                var date = new Date(dateSec * 1000);
                return date.getFullYear() + '-' + zerofill(date.getMonth() + 1) + '-' + zerofill(date.getDate()) + ' ' + zerofill(date.getHours()) + ':' + zerofill(date.getMinutes()) + ':' + zerofill(date.getSeconds());
            };
            ed.container(root, 'click', domFilter, function (el) {
                modalBody.replaceChild(loadingMark, modalBody.firstChild);
                modal.show(historyEl);
                api("clip/history", {id: getParentTr(el).id}).then(function (entries) {
                    var tbody = dom('tbody', null, entries.map(function (date) {
                        return dom('tr', null, dom('td', null, yyyymmdd(date)));
                    }));
                    var table = dom('table', {className: ['table', 'table-condensed', 'table-hover']}, tbody);
                    modalBody.replaceChild(table, modalBody.firstChild);
                });
            });
            return function (ts) {
                var diffSecs = new Date().getTime() / 1000 - ts;
                return Math.floor(diffSecs / (24 * 3600));
            };
        }),
        sourceNote: new Column('c-source-note', 'Source note', function (td) {
            dom.append(td, this.sourceNote);
        }, function (domFilter) {
            ed.container(root, 'click', domFilter, updateHelper(function (el, clip, post) {
                ac(el, el.innerHTML, function (newValue, onSuccess, onReject) {
                    post('sourceNote', newValue, onSuccess, onReject);
                }, []);
            }, this));
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
                    var realDuration = parseInt(hrtm[1], 10) * 60 + parseInt(hrtm[2], 10);
                    post('duration', realDuration, onSuccess, onReject);
                }, []);
            }, this));
            return function (duration) {
                var min = (duration % 60);
                if (min < 10) {
                    min = '0' + min;
                }
                return Math.floor(duration / 60) + ':' + min;
            };
        }, function (clip) {
            return clip.duration <= 0;
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
        }),
        score: new Column('c-score', 'QuickJerk', function (td) {
            dom.append(td, this.jerkScore.toFixed(3));
        }, function (domFilter) {
            var modalEl = document.getElementById('score');
            var tbody = modalEl.querySelector('tbody');
            var scoreB = modalEl.querySelector('b');
            ed.container(root, 'click', domFilter, function (el) {
                var clip = getParentTr(el);
                tbody.innerHTML = '';
                dom.append(tbody, clip.jerkEntries.map(function (resultEntry) { return resultEntry.getTr(); }));
                scoreB.innerHTML = clip.jerkScore.toFixed(3);
                modal.show(modalEl);
            });
        })
    };

    Clip.prototype.renderColumn = function (column) {
        column.render(this.tr.querySelector(column.selector()), this);
    };
    Clip.prototype.setTrAndRender = function (tr, opt_column) { // only rerender opt_column if specified
        this.tr = tr;
        tr.dataset.id = this.id;
        if (opt_column) {
            this.renderColumn(opt_column);
        } else {
            func.forEach(columns, function (column) {
                this.renderColumn(column);
            }.bind(this));
        }
    };
    Clip.prototype.isAnyVoid = function () {
        var clip = this;
        return func.toArray(columns).map(function (column) {
            return column.isVoid(clip);
        }).reduce(function (a, b) { return a || b; }, false);
    };

    return {
        Clip: Clip,
        init: function (json, players) {
            var id;
            for (id in actualClips) {
                if (actualClips.hasOwnProperty(id)) {
                    delete actualClips[id];
                }
            }
            json.forEach(function (json) {
                actualClips[json.id] = new Clip(json);
            });
            var menu = fileOverlay.querySelector('.dropdown-menu');
            players.forEach(function (path) {
                var names = path.split(/\/|\\/g);
                var fileName = names[names.length - 1];
                var a = dom('a', {'href': asel.get('with')}, fileName);
                a.dataset.path = path;
                dom.append(menu, dom('li', null, a));
            });
        },
        getClips: actualClips,
        columns: columns,
        setQuickJerkScoreUpdater: function (callback) {
            quickJerkScoreUpdater = callback;
        }
    };
});
