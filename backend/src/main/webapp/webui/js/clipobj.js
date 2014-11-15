"use strict";

ijkl.module('clipobj', ['querySelector', 'dataset'], function() {

    var api = ijkl('api');
    var as = ijkl('actionselector');
    var cd = ijkl('columndef');
    var dom = ijkl('dom');
    var ed = ijkl('delegation');
    var func = ijkl('function');
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
    ed.target(root, 'mouseover', dom.match(cd.file.selector()), function(el) {
        fileOverlaySpan.innerHTML = getParentTr(el)['path'];
        el.appendChild(fileOverlay);
    });
    ed.target(root, 'mouseout', dom.match(cd.file.selector()), function() {
        document.body.appendChild(fileOverlay);
    });
    ed.target(root, 'mouseover', dom.match(cd.tags.selector()), function(el) {
        var clip = getParentTr(el);
        tm.selectTagOpen(el, function(newTagId, onSuccess, onReject) {
            var proposed = clip.tags.concat([newTagId]);
            api('clip/edit', { 'id': clip['id'], 'key': 'tags', 'value': proposed }).then(function() {
                clip.tags = tags;
                onSuccess();
                cd.tags.render(el, clip);
            }, function(error) {
                api.ALERT(error);
                onReject();
            });
        });
    });
    ed.target(root, 'mouseout', dom.match(cd.tags.selector()), tm.selectTagClose);
    ed.container(root, 'click', dom.match('.tag.removable'), function(el) {
        var td = dom.getParent(el, dom.match(cd.tags.selector()));
        var clip = getParentTr(el);
        var proposed = child.parent.filter(function(parentId) { return parentId !== el.dataset.id; });
        api('clip/edit', { 'id': clip['id'], 'key': 'tags', 'value': proposed }).then(function() {
            clip.tags = tags;
            cd.tags.render(el, clip);
        }, api.ALERT);
    });
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
