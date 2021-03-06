/*globals ijkl*/

ijkl.module('tagmanager', ['querySelector', 'es5Array', 'dataset', 'promise', 'mouseEnterLeave'], function () {
    "use strict";

    var ac = ijkl('autocomplete');
    var api = ijkl('api');
    var dom = ijkl('dom');
    var func = ijkl('function');
    var modal = ijkl('modal');
    var sfoo = ijkl('simplefileopeningoverlay');

    var actualClips;

    var el = document.getElementById('tag-manager');
    var selectTag = document.getElementById('select-tag');
    var tb = el.querySelector('table');
    var actualTags = [];
    var currentAllowTagCreation;
    var currentSelectTagCallback = null; // a function taking a newParent, onSuccess, and onReject

    var Tag = function (id, name, description, bestClip) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.bestClip = bestClip;
        this.children = [];
        this.parent = [];
        this.tr = null;
    };

    var selectTagOpen = function (td, callback, opt_disallowCreation) {
        if (ac.isOpen()) {
            return;
        }
        td.appendChild(selectTag);
        currentAllowTagCreation = !opt_disallowCreation;
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
            var onSuccessNc = function () {
                onSuccess();
                selectTagClose();
            };
            var proposedTag = actualTags.filter(function (tag) {
                return tag.name === newTagName;
            })[0];
            if (!proposedTag) {
                if (currentAllowTagCreation) {
                    if (window.confirm("Such tag does not exist. Create one?")) {
                        api('tag/create', {'name': newTagName}).then(function (ret) {
                            actualTags[ret.id] = new Tag(ret.id, newTagName, ''); // manually append
                            currentSelectTagCallback(ret.id, onSuccessNc, onReject);
                        }, onReject);
                    } else {
                        onReject();
                    }
                } else {
                    alert("Such tag does not exist!");
                    onReject();
                }
            } else {
                currentSelectTagCallback(proposedTag.id, onSuccessNc, onReject);
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
            var tds = [dom('td'), dom('td'), dom('td'), dom('td'), dom('td')];
            var tr = dom('tr', null, tds);
            tag.renderName(tds[0]);
            tag.renderParent(tds[1]);
            tag.renderChildren(tds[2]);
            tag.renderDescription(tds[3]);
            tag.renderBestClip(tds[4]);
            tag.tr = tr;
            tbody.appendChild(tr);
        });
        var table = dom('table', {className: ['table', 'table-condensed', 'table-hover']}, [dom('thead', null, dom('tr', null, [
            dom('th', null, 'Name'), dom('th', null, 'Parents'), dom('th', null, 'Children'), dom('th', null, 'Description'), dom('th', null, 'Best Clip')
        ])), tbody]);
        tb.parentNode.replaceChild(table, tb);
        tb = table;
    };
    var init = function () {
        return api('tag/list').then(function (json) {
            actualTags.length = 0; // empty it
            json.forEach(function (tag) {
                actualTags[tag.id] = new Tag(tag.id, tag.name, tag.description || '', tag.best);
            });
            json.forEach(function (tag) {
                actualTags[tag.id].parent = tag.parent.map(function (tagId) {
                    actualTags[tagId].children.push(actualTags[tag.id]);
                    return actualTags[tagId];
                });
            });
        }, api.FATAL);
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
                    }.bind(this), onReject);
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
                        });
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
                            api('tag/auto', {'dry': true}).then(function (response) {
                                if (!response.length) { return; }
                                var message = response.map(function (clip) {
                                    return clip.clip + ' will have the following added:' + clip.problematicTags.join(', ');
                                }).join('\n');
                                if (window.confirm(message)) {
                                    api('tag/auto', {'dry': false});
                                }
                            });
                        }); // do thing on fail, as init() will take care of it
                    }, onReject);
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
        },
        renderDescription: function (td) {
            dom.append(td, this.description);
            td.addEventListener('click', function () {
                ac(td, this.description, function (newDescription, onSuccess, onReject) {
                    if (newDescription.trim().length) {
                        api('tag/description', {'id': this.id, 'description': newDescription}).then(function () {
                            onSuccess();
                            this.description = newDescription;
                            render(); // this one does not require reload
                        }.bind(this), onReject);
                    }
                }.bind(this), []);
            }.bind(this));
        },
        renderBestClip: function (td) {
            if (!this.bestClip) { return; }
            var clip = actualClips[this.bestClip];
            dom.append(td, clip.file);
            td.addEventListener('mouseenter', function () {
                sfoo.open(this, clip.id, clip.path);
            });
            td.addEventListener('mouseleave', function () {
                sfoo.close();
            });
        }
    };

    return {
        open: function () {
            render();
            modal.show(el);
        },
        init: init,
        getTags: actualTags,
        selectTagClose: selectTagClose,
        selectTagOpen: selectTagOpen,
        setClipsRef: function (clipsRef) {
            actualClips = clipsRef;
        },
        notifyBestClipSet: function (tagId, clipId) {
            actualTags[tagId].bestClip = clipId;
        }
    };
});