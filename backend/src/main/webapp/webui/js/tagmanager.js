"use strict";

ijkl.module('tagmanager', ['querySelector', 'es5Array', 'dataset'], function() {
    var app = ijkl('app');
    var modal = ijkl('modal');
    var func = ijkl('function');
    var api = ijkl('api');
    var dom = ijkl('dom');
    var ie = ijkl('inplaceediting');
    var el = document.getElementById('tag-manager');
    var tb = el.querySelector('table');
    var actualTags = null;
    el.querySelector('button.close').addEventListener('click', function() {
        modal.close(el);
    });
    var render = function() {
        var tbody = dom('tbody', null, dom('tr', null, [
            dom('th', null, 'Name'), dom('th', null, 'Parents'), dom('th', null, 'Children')
        ]));
        func.forEach(func.toArray(actualTags).sort(function(t1, t2) { return t1.name.localeCompare(t2.name); }), function(tag) {
            var tds = [dom('td'), dom('td'), dom('td')];
            var tr = dom('tr', null, tds);
            tag.renderName(tds[0]);
            tag.renderParent(tds[1]);
            tag.renderChildren(tds[2]);
            tag.tr = tr;
            tbody.appendChild(tr);
        });
        return dom('table', { className: ['table', 'table-condensed', 'table-hover'] }, tbody);
    };
    var Tag = function(id, name) {
        this.id = id;
        this.name = name;
        this.children = [];
        this.parent = null;
        this.tr = null;
    };
    Tag.prototype = {
        renderName: function(td) {
            var inEditing = false;
            dom.append(td, this.name);
            td.addEventListener('click', function() {
                ie(this.name, function(newName) {
                    api('tag/edit', { "id": this.id, "name": newName }).then(function(res) {
                        if (res['error']) {
                            alert(res['error']);
                        } else {
                            // reload
                        }
                    }.bind(this));
                });
            }.bind(this));
        },
        renderParent: function(td) {
            dom.append(td, this.parent.map(function(tag) {
                return dom('a', { className: 'tag' }, tag.name);
            }));
        },
        renderChildren: function(td) {
            dom.append(td, this.children.map(function(tag) {
                return dom('a', { className: 'tag' }, tag.name);
            }));
        }
    };
    return {
        open: function() {
            var table = render();
            tb.parentNode.replaceChild(table, tb);
            tb = table;
            modal.show(el);
        },
        init: function(json) {
            actualTags = func.map(json, function(tag, id) {
                return new Tag(id, tag['name']);
            });
            func.forEach(json, function(tag, id) {
                actualTags[id].parent = tag['parent'].map(function(tagId) {
                    actualTags[tagId].children.push(actualTags[id]);
                    return actualTags[tagId];
                });
            });
        },
        getTags: function() { return actualTags; }
    };
});