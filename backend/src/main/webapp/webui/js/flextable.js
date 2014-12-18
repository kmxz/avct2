"use strict";

ijkl.module('flextable', ['dragEvents', 'querySelector', 'es5Array', 'classList'], function () {

    var as = ijkl('actionselector');
    var dom = ijkl('dom');
    var func = ijkl('function');
    var modal = ijkl('modal');

    var currentModalTable = null;
    var modalEl = document.getElementById('column-selector');
    var form = modalEl.querySelector('form');
    var close = function () {
        modal.close(modalEl);
        form.innerHTML = ''; // dirty method to free some resources
    };
    var show = function (table, className, shown) {
        func.toArray(table.querySelectorAll('.' + className)).forEach(function (td) {
            if (shown) {
                td.classList.remove('hidden');
            } else {
                td.classList.add('hidden');
            }
        });
    };
    modalEl.querySelector(as('cancel')).addEventListener('click', close);
    modalEl.querySelector(as('save')).addEventListener('click', function () {
        func.toArray(form.querySelectorAll('input[type=checkbox]')).forEach(function (cb) {
            if (cb.checked) {
                show(currentModalTable, cb.name, true);
            } else {
                show(currentModalTable, cb.name, false);
            }
        });
        close();
    });
    return function (table, columns) {
        var insertBefore = null;
        var currentDrag = null;
        var currentDragover = null;
        var currentVisualAux = null;
        var currentResizeRelative = 0;
        var currentResizeOriginal = 0;
        var getValidClassName = function (el) {
            return columns.map(function (column) {
                return column.className;
            }).filter(function (className) {
                return el.classList.contains(className);
            })[0];
        };
        var removeClass = function (el) {
            if (el) {
                el.classList.remove('shadow-left');
                el.classList.remove('shadow-right');
                el.classList.remove('shadow-doubled');
            }
        };
        var columnSel = function () {
            currentModalTable = table;
            var checkboxes = columns.map(function (info) {
                return {
                    name: info.className,
                    text: info.text, // XXX: this is UGLY!
                    shown: !table.querySelector('.' + info.className).classList.contains('hidden')
                }
            }).map(function (item) {
                var properties = {type: 'checkbox', name: item.name};
                if (item.shown) {
                    properties.checked = 'checked';
                }
                return dom('div', {className: 'col-sm-6'}, dom('div', {className: 'checkbox'}, dom('label', null, [
                    dom('input', properties),
                    item.text
                ])));
            });
            var i;
            for (i = 0; i < checkboxes.length; i += 2) {
                form.appendChild(dom('div', {className: 'form-group'}, (i + 1 < checkboxes.length) ? [checkboxes[i], checkboxes[i + 1]] : checkboxes[i]));
            }
            modal.show(modalEl);
        };
        var getResizeHandle = function () {
            return dom('div', {className: 'resize-handle', draggable: true});
        };
        var fastMoveCurrentItems = function (source, target) {
            func.toArray(table.querySelectorAll('tr')).forEach(function (tr) {
                tr.insertBefore(tr.querySelector('.' + source), target ? tr.querySelector('.' + target) : null);
            });
        };
        var dragOverListener = function (ev) {
            ev.preventDefault(); // i don't know why but this line seems to be necessary
            ev.stopPropagation();
            if (!currentDrag) {
                return;
            }
            insertBefore = currentDrag.nextSibling;
            removeClass(currentDragover);
            removeClass(currentVisualAux);
            currentDragover = this;
            var rect = this.getBoundingClientRect();
            if (currentDragover === currentDrag) {
                return;
            }
            if ((ev.clientX - rect.left) > (rect.right - rect.left) / 2) {
                if (currentDrag.previousSibling !== currentDragover) {
                    currentDragover.classList.add('shadow-right');
                    insertBefore = currentDragover.nextSibling;
                    currentVisualAux = currentDragover.nextSibling;
                    if (currentVisualAux) {
                        currentVisualAux.classList.add('shadow-left');
                    } else {
                        currentDragover.classList.add('shadow-doubled');
                    }
                }
            } else {
                if (currentDrag.nextSibling !== currentDragover) {
                    currentDragover.classList.add('shadow-left');
                    insertBefore = currentDragover;
                    currentVisualAux = currentDragover.previousSibling;
                    if (currentVisualAux) {
                        currentVisualAux.classList.add('shadow-right');
                    } else {
                        currentDragover.classList.add('shadow-doubled');
                    }
                }
            }
        };
        var dragListener = function (ev) {
            currentDrag = this;
            insertBefore = currentDrag.nextSibling;
        };
        var dropListener = function (ev) {
            if (!currentDrag) {
                return;
            }
            removeClass(currentDragover);
            removeClass(currentVisualAux);
            if (currentDrag.nextSibling !== insertBefore) {
                fastMoveCurrentItems(getValidClassName(currentDrag), insertBefore ? getValidClassName(insertBefore) : null);
            }
            currentDrag = null;
        };
        var resizeDragStartListener = function (ev) {
            ev.stopPropagation();
            currentResizeRelative = ev.clientX;
            currentResizeOriginal = this.parentNode.clientWidth;
        };
        var resizeDragListener = function (ev) {
            var nw = ev.clientX - currentResizeRelative + currentResizeOriginal;
            this.parentNode.setAttribute('width', nw);
        };
        table.classList.add('flextable');
        return {
            columnSel: columnSel,
            showColumn: function (className, shown) {
                show(table, className, shown);
            },
            yieldThs: function () {
                return dom('tr', null, columns.map(function (info) {
                    var th = dom('th', {className: info.className, draggable: true}, info.text);
                    th.addEventListener('dragover', dragOverListener);
                    th.addEventListener('dragstart', dragListener);
                    th.addEventListener('drop', dropListener);
                    var resizeHandle = getResizeHandle();
                    resizeHandle.addEventListener('dragstart', resizeDragStartListener);
                    resizeHandle.addEventListener('dragend', resizeDragListener);
                    th.appendChild(resizeHandle);
                    return th;
                }))
            },
            yieldTds: function () {
                return dom('tr', null, columns.map(function (info) {
                    return dom('td', {className: info.className});
                }));
            }
        };
    };
});
