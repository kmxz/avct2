/*globals ijkl*/

ijkl.module('tagmanager', ['querySelector', 'es5Array', 'dataset', 'promise'], function () {
    "use strict";

    var ac = ijkl('autocomplete');
    var api = ijkl('api');
    var dom = ijkl('dom');
    var func = ijkl('function');
    var modal = ijkl('modal');

    var el = document.getElementById('tag-manager');
    var selectTag = document.getElementById('select-tag');
    var tb = el.querySelector('table');
    var actualTags = null;
    var currentSelectTagCallback = null; // a function taking a newParent, onSuccess, and onReject

    var Tag = function (id, name) {
        this.id = id;
        this.name = name;
        this.children = [];
        this.parent = [];
        this.tr = null;
    };

    var selectTagOpen = function (td, callback) {
        if (ac.isOpen()) {
            return;
        }
        td.appendChild(selectTag);
        currentSelectTagCallback = callback;
    };
    var selectTagClose = function () {
        if (ac.isOpen()) {
            return;
        }
        document.body.appendChild(selectTag);
    };
    selectTag.addEventListener('click', function () {
        ac(selectTag, '', function (newTagName, onSuccess, onReject) {
            var proposedTag = actualTags.filter(function (tag) {
                return tag.name === newTagName;
            })[0];
            if (!proposedTag) {
                if (window.confirm("Such tag does not exist. Create one?")) {
                    api('tag/create', {'name': newTagName}).then(function (ret) {
                        actualTags[ret.id] = new Tag(ret.id, newTagName); // manually append
                        currentSelectTagCallback(ret.id, onSuccess, onReject);
                    }, function (error) {
                        api.ALERT(error);
                        onReject();
                    });
                } else {
                    onReject();
                }
            } else {
                currentSelectTagCallback(proposedTag.id, onSuccess, onReject);
            }
        }, actualTags.map(function (tag) {
            return tag.name;
        }));
    });
    var render = function () {
        var tbody = dom('tbody');
        func.forEach(func.toArray(actualTags).sort(function (t1, t2) {
            return t1.name.localeCompare(t2.name);
        }), function (tag) {
            var tds = [dom('td'), dom('td'), dom('td')];
            var tr = dom('tr', null, tds);
            tag.renderName(tds[0]);
            tag.renderParent(tds[1]);
            tag.renderChildren(tds[2]);
            tag.tr = tr;
            tbody.appendChild(tr);
        });
        var table = dom('table', {className: ['table', 'table-condensed', 'table-hover']}, [dom('thead', null, dom('tr', null, [
            dom('th', null, 'Name'), dom('th', null, 'Parents'), dom('th', null, 'Children')
        ])), tbody]);
        tb.parentNode.replaceChild(table, tb);
        tb = table;
    };
    var init = function () {
        return api('tag/list').then(function (json) {
            actualTags = [];
            json.forEach(function (tag) {
                actualTags[tag.id] = new Tag(tag.id, tag.name);
            });
            json.forEach(function (tag) {
                actualTags[tag.id].parent = tag.parent.map(function (tagId) {
                    actualTags[tagId].children.push(actualTags[tag.id]);
                    return actualTags[tagId];
                });
            });
        }, function (error) {
            api.FATAL(error);
        });
    };
    Tag.prototype = {
        renderName: function (td) {
            dom.append(td, this.name);
            td.addEventListener('click', function () {
                ac(td, this.name, function (newName, onSuccess, onReject) {
                    api('tag/edit', {'id': this.id, 'name': newName}).then(function () {
                        onSuccess();
                        this.name = newName;
                        render(); // this one does not require reload
                    }.bind(this), function (error) {
                        api.ALERT(error);
                        onReject();
                    }.bind(this));
                }.bind(this), []);
            }.bind(this));
        },
        renderParent: function (td) {
            var child = this;
            dom.append(td, this.parent.map(function (tag) {
                var tagEl = dom('a', {className: ['tag', 'removable'], title: "Click to remove"}, tag.name);
                tagEl.addEventListener('click', function () {
                    if (window.confirm('Remove this tag from parent tag list?')) {
                        var proposed = child.parent.map(function (parent) {
                            return parent.id;
                        }).filter(function (parentId) {
                            return parentId !== tag.id;
                        });
                        api('tag/parent', {'parent': proposed, 'id': child.id}).then(function () {
                            init().then(function () {
                                render();
                            }); // do thing on fail, as init() will take care of it
                        }, api.ALERT);
                    }
                });
                return tagEl;
            }));
            td.addEventListener('mouseenter', function () {
                selectTagOpen(td, function (newParentId, onSuccess, onReject) {
                    var proposed = child.parent.map(function (tag) {
                        return tag.id;
                    }).concat([newParentId]);
                    api('tag/parent', {'parent': proposed, 'id': child.id}).then(function () {
                        init().then(function () {
                            onSuccess();
                            render();
                        }); // do thing on fail, as init() will take care of it
                    }, function (error) {
                        api.ALERT(error);
                        onReject();
                    });
                });
            });
            td.addEventListener('mouseleave', function () {
                selectTagClose();
            });
        },
        renderChildren: function (td) {
            dom.append(td, this.children.map(function (tag) {
                return dom('a', {className: 'tag'}, tag.name);
            }));
        }
    };

    return {
        open: function () {
            render();
            modal.show(el);
        },
        init: init,
        getTags: function () {
            return actualTags;
        },
        selectTagClose: selectTagClose,
        selectTagOpen: selectTagOpen
    };
});