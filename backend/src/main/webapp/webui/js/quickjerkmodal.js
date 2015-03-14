/*global ijkl*/

ijkl.module('quickjerkmodal', ['querySelector', 'mouseEnterLeave', 'dataset', 'classList'], function () {
    "use strict";

    var asel = ijkl('actionselector');
    var dom = ijkl('dom');
    var ed = ijkl('delegation');
    var func = ijkl('function');
    var modal = ijkl('modal');
    var qjmech = ijkl('quickjerkmechanism');
    var sm = ijkl('studiomanager');
    var tm = ijkl('tagmanager');

    var qm = document.getElementById('quickjerk');
    var tp = document.getElementById('templates');
    var mb = qm.querySelector('.modal-body');

    var cb = qm.querySelector(asel('cancel'));
    var sb = qm.querySelector(asel('apply'));

    var processTypes = {
        'random': {
            getCriterion: function () {
                return new qjmech.builders.random();
            }
        },
        'race': {
            getCriterion: function (el) {
                var checkedOne = func.toArray(el.querySelectorAll('input[type=radio]')).filter(function (input) {
                    return input.checked;
                })[0];
                if (!checkedOne) {
                    return null;
                }
                return new qjmech.builders.race(checkedOne.nextSibling.textContent.trim());
            }
        },
        'role': {
            getCriterion: function (el) {
                var allChecked = func.toArray(el.querySelectorAll('input[type=checkbox]')).filter(function (input) {
                    return input.checked;
                });
                if (!allChecked.length) {
                    return null;
                }
                return new qjmech.builders.role(allChecked.map(function (input) {
                    return input.nextSibling.textContent.trim();
                }));
            }
        },
        'tag': {
            getCriterion: function (el) {
                var allTags = tm.getTags();
                var pickedTags = func.toArray(el.querySelectorAll('.tag')).map(function (tel) {
                    return allTags[tel.dataset.id];
                });
                if (!pickedTags.length) {
                    return null;
                }
                return new qjmech.builders.tag(pickedTags);
            },
            init: function (el) {
                var ec = el.querySelector('.tag-container');
                ec.addEventListener('mouseenter', function () {
                    tm.selectTagOpen(ec, function (newTagId, onSuccess, onReject) {
                        var a = dom('a', {className: ['tag', 'removable']}, tm.getTags()[newTagId].name);
                        a.dataset.id = newTagId;
                        ec.appendChild(a);
                        onSuccess();
                    }, true);
                });
                ec.addEventListener('mouseleave', tm.selectTagClose);
                ed.container(el, 'click', dom.match('.tag.removable'), function (tagEl) {
                    ec.removeChild(tagEl);
                });
            }
        },
        'grade': {
            getCriterion: function (el) {
                var parsed = parseFloat(el.querySelector('input').value);
                if (isNaN(parsed)) {
                    return null;
                }
                return new qjmech.builders.grade(parsed);
            }
        },
        'lastplay': {
            getCriterion: function (el) {
                var parsed = parseFloat(el.querySelector('input').value);
                if (isNaN(parsed)) {
                    return null;
                }
                return new qjmech.builders.lastView(parsed);
            }
        },
        'playcount': {
            getCriterion: function (el) {
                var parsed = parseFloat(el.querySelector('input').value);
                if (isNaN(parsed)) {
                    return null;
                }
                return new qjmech.builders.playCount(parsed);
            }
        },
        'keyword': {
            getCriterion: function (el) {
                var keywords = el.querySelector('input[type=text]').value.split(/\s/g).filter(function (str) {
                    return str.length;
                });
                var checked = el.querySelector('input[type=checkbox]').checked;
                if (!keywords.length) {
                    return null;
                }
                return new qjmech.builders.keyword(keywords, checked);
            }
        },
        'studio': {
            getCriterion: function (el) {
                var studio = parseInt(el.querySelector('.studio-name').dataset.id, 10);
                if (isNaN(studio)) {
                    return null;
                }
                return new qjmech.builders.studio(studio);
            },
            init: function (el) {
                var lb = el.querySelector('.studio-label');
                var sn = el.querySelector('.studio-name');
                lb.addEventListener('click', function () {
                    sm.open(lb, sn.innerHTML, function (proposedStudio, onSuccess) {
                        sn.dataset.id = proposedStudio;
                        lb.innerHTML = 'Click to modify';
                        lb.classList.remove('label-warning');
                        lb.classList.add('label-default');
                        sn.innerHTML = sm.getStudio(proposedStudio);
                        onSuccess();
                    }, false);
                }); // update all columns!
            }
        }
    };

    func.forEach(processTypes, function (value, key) {
        qm.querySelector(asel(key)).addEventListener('click', function () {
            var el = tp.querySelector('.template-' + key).cloneNode(true);
            var deletion = dom('a', {className: ['btn', 'btn-default']}, 'Delete');
            deletion.addEventListener('click', function () {
                mb.removeChild(el);
            });
            mb.appendChild(el);
            el.appendChild(
                dom('div', {className: 'panel-footer' },
                    dom('form', {className: 'form-inline'}, [
                        deletion,
                        dom('div', {className: 'form-group'}, [
                            dom('div', {className: 'input-group'}, [
                                dom('div', {className: 'input-group-addon'}, 'weight = '),
                                dom('input', {className: ['form-control', 'weight'], value: '1', type: 'text'})
                            ])
                        ])
                    ])
                )
            );
            if (value.init) {
                value.init(el);
            }
        });
    });

    var applyPolicy = function () {
        var allCriteria = func.toArray(mb.children).filter(function (el) { return el.classList.contains('panel'); }).map(function (panel) {
            var targetType = func.toArray(panel.classList).filter(function (className) { return className.substring(0, 9) === 'template-'; })[0].substring(9);
            var createdCriterion = processTypes[targetType].getCriterion(panel.querySelector('.panel-body'));
            if (createdCriterion) {
                createdCriterion.weight = parseFloat(panel.querySelector('.weight').value) || 1;
            }
            return createdCriterion;
        }).filter(func.identity);
        qjmech.runCriteria(allCriteria);
    };

    var init = {
        race: function () {
            var src = document.getElementById('race-select');
            var all = func.toArray(src.querySelectorAll('div.radio'));
            var template = document.getElementById('templates').querySelector('.template-race form.form-inline');
            template.innerHTML = '';
            all.forEach(function (each) {
                var cloned = each.firstChild.cloneNode(true);
                cloned.classList.remove('radio');
                cloned.classList.add('radio-inline');
                template.appendChild(cloned);
            });
        },
        role: function () {
            var src = document.getElementById('role-editor');
            var all = func.toArray(src.querySelectorAll('div.checkbox'));
            var template = document.getElementById('templates').querySelector('.template-role form.form-inline');
            template.innerHTML = '';
            all.forEach(function (each) {
                var cloned = each.firstChild.cloneNode(true);
                cloned.classList.remove('checkbox');
                cloned.classList.add('checkbox-inline');
                template.appendChild(cloned);
            });
        }
    };

    cb.addEventListener('click', function () {
        modal.close();
    });

    sb.addEventListener('click', function () {
        applyPolicy();
        modal.close();
    });

    return {
        show: function () {
            modal.show(qm);
        },
        init: function () {
            init.race();
            init.role();
        }
    };
});