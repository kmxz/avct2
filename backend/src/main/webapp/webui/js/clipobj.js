"use strict";

ijkl.module('clipobj', ['querySelector', 'dataset'], function() {

    var ac = ijkl('autocomplete');
    var api = ijkl('api');
    var as = ijkl('actionselector');
    var cd = ijkl('columndef');
    var dom = ijkl('dom');
    var ed = ijkl('delegation');
    var func = ijkl('function');
    var po = ijkl('popover');
    var tm = ijkl('tagmanager');

    var root = document.getElementById("root");
    var actualClips = null;
    var fileOverlay = document.getElementById('file-overlay');
    var fileOverlaySpan = fileOverlay.querySelector('span');
    var getParentTr = function(el) {
        var cur = dom.getParent(el, dom.match('tr[data-id]'));
        if (cur) {
            return actualClips[cur.dataset.id];
        } else {
            return null;
        }
    };
    fileOverlay.querySelector(as('open')).addEventListener('click', function() {
        api('clip/open', { "id": getParentTr(this)['id'] });
    });
    fileOverlay.querySelector(as('folder')).addEventListener('click', function() {
        api('clip/folder', { "id": getParentTr(this)['id'] });
    });

    var Clip = function(json) { // XXX: this is ugly
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

    Clip.prototype = {
        setTrAndRenderAll: function(tr) {
            this.tr = tr;
            tr.dataset.id = this.id;
            func.forEach(cd, function(column) {
                column.render(tr.querySelector(column.selector()), this);
            }.bind(this));
        }
    };

    var reinitThenRerender = function(oldClip, json) {
        var id = oldClip.id;
        var tr = oldClip.tr;
        actualClips[id] = new Clip(json);
        actualClips[id].setTrAndRenderAll(tr);
    };
    var updateHelper = function(raw) {
        return function(el) {
            var clip = getParentTr(el);
            if (!clip) { return; } // not sure if this line is necessary (considering the header)
            var post = function(key, value, onSuccess, onReject) {
                api('clip/edit', { 'id': clip.id, 'key': key, 'value': value }).then(function(json) {
                    if (onSuccess) { onSuccess(json); }
                    reinitThenRerender(clip, json); // TODO: maybe only rerender current td?
                }, function(error) {
                    if (onReject) { onReject(error); }
                    api.ALERT(error);
                });
            };
            raw(el, clip, post);
        };
    };
    ed.target(root, 'mouseover', dom.match(cd.file.selector()), function(el) {
        fileOverlaySpan.innerHTML = getParentTr(el)['path'];
        el.appendChild(fileOverlay);
    });
    ed.target(root, 'mouseout', dom.match(cd.file.selector()), function() {
        document.body.appendChild(fileOverlay);
    });
    ed.target(root, 'mouseover', dom.match(cd.tags.selector()), updateHelper(function(el, clip, post) {
        tm.selectTagOpen(el, function(newTagId, onSuccess, onReject) {
            var proposed = clip.tags.concat([newTagId]);
            post('tags', proposed, onSuccess, onReject);
        });
    }));
    ed.target(root, 'mouseout', dom.match(cd.tags.selector()), tm.selectTagClose);
    ed.container(root, 'click', dom.match('.tag.removable'), updateHelper(function(el, clip, post) {
        var td = dom.getParent(el, dom.match(cd.tags.selector()));
        if (window.confirm('Remove this tag from this clip\'s tag list?')) {
            var proposed = clip.tags.filter(function (parentId) {
                return parentId !== parseInt(el.dataset.id);
            });
            post('tags', proposed);
        }
    }));
    ed.container(root, 'click', dom.match(cd.duration.selector()), updateHelper(function(el, clip, post) {
        ac(el, el.innerHTML, function(newValue, onSuccess, onReject) {
            var hrtm = newValue.match(/^([0-9]+):([0-9]{2})$/);
            if (!hrtm) { window.alert("The number format is illegal!"); onReject(); return; }
            var realDuration = parseInt(hrtm[1]) * 60 + parseInt(hrtm[2]);
            post('duration', realDuration, onSuccess, onReject)
        },[]);
    }));
    ed.target(root, 'mouseover', dom.match('.grade-star'), updateHelper(function(el, clip, post) {
        var grade = parseInt(el.dataset.grade);
        var stars = el.parentNode.children;
        var i = 1;
        var cl;
        var icl = function(fill) {
            cl = stars[i - 1].classList;
            cl.remove(fill ? 'glyphicon-star-empty' : 'glyphicon-star');
            cl.add(fill ? 'glyphicon-star' : 'glyphicon-star-empty');
        }
        if (grade >= clip.grade) {
            for (; i <= clip.grade; i++) { icl(true); cl.remove('golden-star'); }
            for (; i <= grade; i++) { icl(true); cl.add('golden-star'); }
        } else if (grade < clip.grade) {
            for (; i <= grade; i++) { icl(true); cl.add('golden-star'); }
            for (; i <=  clip.grade; i++) { icl(true); cl.remove('golden-star'); }
        }
        for (; i <= 5; i++) { icl(false); cl.remove('golden-star'); }
    }));
    ed.container(root, 'click', dom.match('.grade-star'), updateHelper(function(el, clip, post) {
        post('grade', el.dataset.grade);
    }));
    ed.target(root, "mouseout", dom.match(cd.grade.selector()), function(el) {
        cd.grade.render(el, getParentTr(el)); // clear golden stars
    });
    var reEl = document.getElementById('role-editor');
    var re = po(reEl);
    var allRoleInputs = func.toArray(reEl.querySelectorAll('input[type=checkbox]')).map(function(single) {
        return { value: single.nextSibling.textContent, element: single };
    });
    ed.container(root, 'click', dom.match(cd.role.selector()), updateHelper(function(el, clip, post) {
        allRoleInputs.forEach(function(single) {
            if (clip.role.indexOf(single.value) < 0) {
                single.element.checked = false;
            } else {
                single.element.checked = true;
            }
        });
        re(el, function(onSuccess, onReject) {
            post('role', allInputs.filter(function(single) {
                return single.element.checked;
            }).map(function(single) {
                return single.value;
            }), onSuccess, onReject);
        });
    }));
    var rsEl = document.getElementById('race-select');
    var rs = po(rsEl);
    var allRaceInputs = func.toArray(rsEl.querySelectorAll('input[type=radio]')).map(function(single) {
        return { value: single.nextSibling.textContent, element: single };
    });
    ed.container(root, 'click', dom.match(cd.race.selector()), updateHelper(function(el, clip, post) {
        allRaceInputs.forEach(function(single) {
            if (clip.role.indexOf(single.value) < 0) {
                single.element.checked = false;
            } else {
                single.element.checked = true;
            }
        });
        rs(el, function(onSuccess, onReject) {
            post('race', allInputs.filter(function(single) {
                return single.element.checked;
            })[0].value, onSuccess, onReject);
        });
    }));
    return {
        Clip: Clip,
        init: function(json) {
            actualClips = [];
            json.forEach(function(json) {
                actualClips[json['id']] = new Clip(json);
            });
        },
        getClips: function() {
            return actualClips;
        }
    };
});
