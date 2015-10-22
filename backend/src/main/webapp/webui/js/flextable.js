/*globals ijkl*/

ijkl.module('flextable', ['dragEvents', 'querySelector', 'es5Array', 'classList'], function () {
    "use strict";

    var asel = ijkl('actionselector');
    var dom = ijkl('dom');
    var func = ijkl('function');
    var modal = ijkl('modal');

    var currentModalTable = null;
    var currentModalExtable = null;
    var modalEl = document.getElementById('column-selector');
    var form = modalEl.querySelector('form');
    var close = function () {
        modal.close(modalEl);
        form.innerHTML = ''; // dirty method to free some resources
    };
    var show = function (table, extable, className, shown) {
        var handleTr = function (tr) {
            var td = tr.querySelector('.' + className);
            if (!td) { return; }
            if (shown) {
                td.classList.remove('hidden');
            } else {
                td.classList.add('hidden');
            }
        };
        handleTr(table.querySelector('tr')); // th
        extable.pool.forEach(handleTr);
    };
    modalEl.querySelector(asel('cancel')).addEventListener('click', close);
    modalEl.querySelector(asel('apply')).addEventListener('click', function () {
        func.toArray(form.querySelectorAll('input[type=checkbox]')).forEach(function (cb) {
            if (cb.checked) {
                show(currentModalTable, currentModalExtable, cb.name, true);
            } else {
                show(currentModalTable, currentModalExtable, cb.name, false);
            }
        });
        close();
    });
    return function (table, columns, extable) {
        var insertBefore = null;
        var currentDrag = null;
        var currentDragover = null;
        var currentVisualAux = null;
        var currentResizeHandle = null;
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
            currentModalExtable = extable;
            var checkboxes = columns.map(function (info) {
                return {
                    name: info.className,
                    text: info.text, // XXX: this is UGLY!
                    shown: !table.querySelector('.' + info.className).classList.contains('hidden') // from th
                };
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
            var handleTr = function (tr) {
                tr.insertBefore(tr.querySelector('.' + source), target ? tr.querySelector('.' + target) : null);
            };
            handleTr(table.querySelector('tr')); // th
            extable.pool.forEach(handleTr);
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
                    currentVisualAux = currentDragover.nextSibling;
                    while (currentVisualAux && currentVisualAux.classList.contains('hidden')) { currentVisualAux = currentVisualAux.nextSibling; }
                    insertBefore = currentVisualAux;
                    if (currentVisualAux) {
                        currentVisualAux.classList.add('shadow-left');
                    } else {
                        currentDragover.classList.add('shadow-doubled');
                    }
                }
            } else {
                if (currentDrag.nextSibling !== currentDragover) {
                    currentDragover.classList.add('shadow-left');
                    currentVisualAux = currentDragover.previousSibling;
                    while (currentVisualAux && currentVisualAux.classList.contains('hidden')) { currentVisualAux = currentVisualAux.previousSibling; }
                    insertBefore = currentDragover;
                    if (currentVisualAux) {
                        currentVisualAux.classList.add('shadow-right');
                    } else {
                        currentDragover.classList.add('shadow-doubled');
                    }
                }
            }
        };
        var dragListener = function (ev) {
            ev.dataTransfer.setData('firefox', 'hack'); // http://stackoverflow.com/a/20908112
            currentDrag = this;
            insertBefore = currentDrag.nextSibling;
        };
        var dropListener = function (ev) {
            if (currentDrag) {
                removeClass(currentDragover);
                removeClass(currentVisualAux);
                if (currentDrag.nextSibling !== insertBefore) {
                    fastMoveCurrentItems(getValidClassName(currentDrag), insertBefore ? getValidClassName(insertBefore) : null);
                }
            }
            currentDrag = null;
            if (currentResizeHandle) {
                currentResizeHandle.parentNode.setAttribute('width', ev.clientX - currentResizeRelative + currentResizeOriginal);
            }
            currentResizeHandle = null;
        };
        var resizeDragStartListener = function (ev) {
            ev.stopPropagation(); // don't trigger the parent listener for rearranging
            ev.dataTransfer.setData('firefox', 'hack'); // http://stackoverflow.com/a/20908112
            currentResizeHandle = this;
            currentResizeRelative = ev.clientX;
            currentResizeOriginal = this.parentNode.clientWidth;
        };
        table.classList.add('flextable');
        return {
            columnSel: columnSel,
            showColumn: function (className, shown) {
                show(table, extable, className, shown);
            },
            yieldThs: function () {
                return dom('tr', null, columns.map(function (info) {
                    var th = dom('th', {className: info.className, draggable: true}, info.text);
                    th.addEventListener('dragover', dragOverListener);
                    th.addEventListener('dragstart', dragListener);
                    th.addEventListener('drop', dropListener);
                    var resizeHandle = getResizeHandle();
                    resizeHandle.addEventListener('dragstart', resizeDragStartListener);
                    th.appendChild(resizeHandle);
                    return th;
                }));
            },
            yieldTds: function () {
                return dom('tr', null, columns.map(function (info) {
                    return dom('td', {className: info.className});
                }));
            }
        };
    };
});