/*global ijkl*/

ijkl.module('quickjerkmodal', ['querySelector'], function () {
    "use strict";

    var asel = ijkl('actionselector');
    var dom = ijkl('dom');
    var modal = ijkl('modal');
    var qjm = ijkl('quickjerkmechanism');

    var qm = document.getElementById('quickjerk');
    var tp = document.getElementById('templates');
    var mb = qm.querySelector('.modal-body');

    ['random', 'race', 'role', 'tag', 'grade', 'lastplay', 'playcount', 'keyword'].forEach(function (key) {
        qm.querySelector(asel(key)).addEventListener('click', function () {
            var el = tp.querySelector('.template-' + key).cloneNode(true);
            mb.appendChild(el);
            el.querySelector('.panel-body').appendChild(dom('form', { className: 'form-inline' }, [
                dom('div', { className: 'form-group' }, [
                    dom('div', { className: 'input-group' }, [
                        dom('div', { className: 'input-group-addon' }, 'weight = '),
                        dom('input', { className: 'form-control', value: '1', type: 'text' })
                    ])
                ]),
                dom('div', { className: 'form-group' }, dom('a', { className: ['btn', 'btn-default'] }, 'Delete'))
            ]));
        });
    });
    return function () {
        modal.show(qm);
    };

});