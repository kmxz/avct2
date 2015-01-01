/*global ijkl*/

ijkl.module('quickjerkmodal', ['querySelector', 'mouseEnterLeave', 'dataset', 'classList'], function () {
    "use strict";

    var asel = ijkl('actionselector');
    var dom = ijkl('dom');
    var ed = ijkl('delegation');
    var func = ijkl('function');
    var modal = ijkl('modal');
    var qjmech = ijkl('quickjerkmechanism');
    var tm = ijkl('tagmanager');

    var qm = document.getElementById('quickjerk');
    var tp = document.getElementById('templates');
    var mb = qm.querySelector('.modal-body');

    var cb = qm.querySelector(asel('cancel'));
    var sb = qm.querySelector(asel('apply'));

    cb.addEventListener('click', function () {
        modal.close();
    });

    var initTagCriterionUi = function (el) {
        var ec = el.querySelector('.tag-container');
        ec.addEventListener('mouseenter', function () {
            tm.selectTagOpen(ec, function (newTagId, onSuccess, onReject) {
                var a = dom('a', { className: ['tag', 'removable'] }, tm.getTags()[newTagId].name);
                a.dataset.id = newTagId;
                ec.appendChild(a);
                onSuccess();
            }, true);
        });
        ec.addEventListener('mouseleave', tm.selectTagClose);
        ed.container(el, 'click', dom.match('.tag.removable'), function (tagEl) {
            ec.removeChild(tagEl);
        });
    };

    ['random', 'race', 'role', 'tag', 'grade', 'lastplay', 'playcount', 'keyword'].forEach(function (key) {
        qm.querySelector(asel(key)).addEventListener('click', function () {
            var el = tp.querySelector('.template-' + key).cloneNode(true);
            mb.appendChild(el);
            el.appendChild(
                dom('div', {className: 'panel-footer' },
                    dom('form', {className: 'form-inline'}, [
                        dom('a', {className: ['btn', 'btn-default']}, 'Delete'),
                        dom('div', {className: 'form-group'}, [
                            dom('div', {className: 'input-group'}, [
                                dom('div', {className: 'input-group-addon'}, 'weight = '),
                                dom('input', {className: 'form-control', value: '1', type: 'text'})
                            ])
                        ])
                    ])
                )
            );
            if (key === 'tag') {
                initTagCriterionUi(el);
            }
        });
    });

    var init = {
        race: function () {
            var src = document.getElementById('race-select');
            var all = func.toArray(src.querySelectorAll('div.radio'));
            var template = document.getElementById('templates').querySelector('.template-role form.form-inline');
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
            var template = document.getElementById('templates').querySelector('.template-race form.form-inline');
            template.innerHTML = '';
            all.forEach(function (each) {
                var cloned = each.firstChild.cloneNode(true);
                cloned.classList.remove('checkbox');
                cloned.classList.add('checkbox-inline');
                template.appendChild(cloned);
            });
        }
    };
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