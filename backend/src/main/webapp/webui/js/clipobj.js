"use strict";

ijkl.module('clipobj', ['querySelector', 'dataset', 'matches'], function() {
    var dom = ijkl('dom');
    var func = ijkl('function');
    var as = ijkl('actionselector');
    var api = ijkl('api');
    var app = ijkl('app'); // don't worry, singleton
    var ed = ijkl('delegation');
    var tm = ijkl('tagmanager');
    var root = document.getElementById("root");
    var fileOverlay = document.getElementById('file-overlay');
    var fileOverlaySpan = fileOverlay.querySelector('span');
    fileOverlay.querySelector(as('open')).addEventListener('click', function() {
        api('clip/open', { "id": app.getParentTr(this)['id'] });
    });
    fileOverlay.querySelector(as('folder')).addEventListener('click', function() {
        api('clip/folder', { "id": app.getParentTr(this)['id'] });
    });
    var Clip = function(json) {
        func.forEach(json, function(value, key) {
            this[key] = value;
        }.bind(this));
        this.tr = null;
    };
    var empty = function(field) {
        return dom('span', { className: ['label', 'label-warning'] }, 'No ' + field + '!');
    };
    Clip.prototype = {
        renderStudio: function(td, studios) {
            dom.append(td, studios[this['studio']]);
        },
        renderThumb: function(td) {
            if (!this['thumbSet']) {
                td.appendChild(empty('thumb'));
            } else {
                //td.appendChild(dom('img', {src: '/clip/' + this['id'] + '/thumb', className: 'clip-thumb'}));
            }
        },
        renderName: function(td) {
            dom.append(td, this['file']);
        },
        renderRole: function(td) {
            if (!this['role'].length) {
                td.appendChild(empty('roles'));
            } else {
                dom.append(td, this['role'].map(function(role) {
                    return dom('a', { className: 'tag' }, role);
                }));
            }
        },
        renderTags: function(td, tags) {
            if (!this['tags'].length) {
                td.appendChild(empty('tags'));
            } else {
                dom.append(td, this['tags'].map(function (tag) {
                    return dom('a', { className: ['tag', 'removable'], title: "Click to remove" }, tags[tag].name);
                }));
            }
        },
        renderGrade: function(td) {
            if (this['grade'] <= 0) {
                td.appendChild(empty('grade'));
            } else {
                var list = [];
                for (var i = 1; i <= 5; i++) {
                    list.push(dom('span', { className: ['glyphicon', i <= this['grade'] ? 'glyphicon-star' : 'glyphicon-star-empty'] }));
                }
                dom.append(td, list);
            }
        },
        setTr: function(tr) {
            this.tr = tr;
            tr.dataset.id = this['id'];
        }
    };
    var match = function(selector) {
        return function(el) { return (el instanceof HTMLElement) && el.matches(selector); }
    };
    ed.target(root, 'mouseover', match('td.c-file'), function(el) {
        fileOverlaySpan.innerHTML = app.getParentTr(el)['path'];
        el.appendChild(fileOverlay);
    });
    ed.target(root, 'mouseout', match('td.c-file'), function() {
        document.body.appendChild(fileOverlay);
    });
    ed.target(root, 'mouseover', match('td.c-tags'), function(el) {
        tm.selectTagOpen(el, function(newTagId, onSuccess, onReject) {
            // TODO
        });
    });
    ed.target(root, 'mouseout', match('td.c-tags'), tm.selectTagClose);
    ed.container(root, 'click', match('.tag.removable'), function(el) {
        app.getParentTr(el);
    });
    return Clip;
});
