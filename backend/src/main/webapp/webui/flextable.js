ijkl.module('flextable', ['dragEvents', 'querySelector', 'es5Array', 'classList'], function() {
	var functionModule = ijkl('function');
	var dom = ijkl('dom');
	var modal = ijkl('modal');
	var as = ijkl('actionselector');
	var currentModalTable = null;
	var modalEl = document.getElementById('column-selector');
	var form = modalEl.querySelector('form');
	modalEl.querySelector(as('cancel')).addEventListener('click', function() {
		modal.close(modalEl);
	});
	modalEl.querySelector(as('save')).addEventListener('click', function() {
		functionModule.toArray(form.querySelectorAll('input[type=checkbox]')).forEach(function(cb) {
			console.log(cb.name);
			functionModule.toArray(currentModalTable.getElementsByClassName(cb.name)).forEach(function(td) {
				console.log('REA');
				if (cb.checked) {
					td.classList.remove('hidden');
				} else {
					td.classList.add('hidden');
				}
			});
		});
		modal.close(modalEl);
	});
	return function(table) {
		var insertBefore = null;
		var currentDrag = null;
		var currentDragover = null;
		var currentVisualAux = null;
		var resizeHandle = null;
		var order = [];
		var currentResizegRelative = 0;
		var currentResizeOriginal = 0;
		var i, ths;
		var draggable = { draggable: true };
		var getElementIndex = function(el) {
			var cl, i;
			if (el === null) { return -1; }
			cl = el.parentNode.children;
			for (i = 0; i < cl.length; i++) {
				if (el == cl[i]) { return i; }
			}
		};
		var removeClass = function(el) {
			if (el) {
				el.classList.remove('shadow-left');
				el.classList.remove('shadow-right');
				el.classList.remove('shadow-doubled');
			}
		};
		var columnSel = function() {
			currentModalTable = table;
			form.innerHTML = '';
			var checkboxes = functionModule.toArray(table.querySelector('tr').querySelectorAll('th')).map(function(el) {
				return {
					name: functionModule.toArray(el.classList).filter(function(className) { return className.substring(0, 4) === 'col-'; })[0],
					text: el.firstChild.textContent, // XXX: this is UGLY!
					shown: !el.classList.contains('hidden')
				}
			}).map(function(item) {
				var properties = { type: 'checkbox', name: item.name };
				if (item.shown) { properties.checked = 'checked'; }
				return dom('div', { className: 'col-sm-6' }, dom('div', { className: 'checkbox' }, dom('label', null, [
					dom('input', properties),
					item.text
				])));
			});
			var i;
			for (i = 0; i < checkboxes.length; i += 2) {
				form.appendChild(dom('div', { className: 'form-group' }, (i + 1 < checkboxes.length) ? [checkboxes[i], checkboxes[i + 1]] : checkboxes[i]));
			}
			modal.show(modalEl);
		};
		var getResizeHandle = function() {
			return dom('div', { className: 'resize-handle', draggable: true });
		};
		var fastMoveCurrentItems = function(source, target) {
			if (target < 0) { target = order.length; }
			order.splice(target, 0, order.splice(source, 1));
			functionModule.toArray(table.querySelectorAll('tr')).forEach(function(tr) {
				tr.insertBefore(tr.children[source], tr.children[target]);
			});
		};
		var addTr = function(content) {
			var tr = document.createElement('tr');
			order.forEach(function(index) {
				tr.appendChild(content[index]);
			});
			return tr;
		};
		var dragOverListener = function(ev) {
			ev.preventDefault(); // i don't know why but this line seems to be necessary
			ev.stopPropagation();
			if (!currentDrag) { return; }
			insertBefore = currentDrag.nextSibling;
			removeClass(currentDragover);
			removeClass(currentVisualAux);
			currentDragover = this;
			var rect = this.getBoundingClientRect();
			if (currentDragover === currentDrag) { return; }
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
		var dragListener = function(ev) {
			currentDrag = this;
			insertBefore = currentDrag.nextSibling;
		};
		var dropListener = function(ev) {
			if (!currentDrag) { return; }
			removeClass(currentDragover);
			removeClass(currentVisualAux);
			if (currentDrag.nextSibling !== insertBefore) {
				fastMoveCurrentItems(getElementIndex(currentDrag), getElementIndex(insertBefore));
			}
			currentDrag = null;
		};
		var resizeDragStartListener = function(ev) {
			ev.stopPropagation();
			currentResizeRelative = ev.clientX;
			currentResizeOriginal = this.parentNode.clientWidth;
		};
		var resizeDragListener = function(ev) {
			var nw = ev.clientX - currentResizeRelative + currentResizeOriginal;
			console.log(nw);
			this.parentNode.setAttribute('width', nw);
		};
		table.classList.add('flextable');
		ths = table.querySelector('tr').querySelectorAll('th');
		for (i = 0; i < ths.length; i++) {
			order.push(i);
			dom.set(ths[i], draggable);
			ths[i].addEventListener('dragover', dragOverListener);
			ths[i].addEventListener('dragstart', dragListener);
			ths[i].addEventListener('drop', dropListener);
			resizeHandle = getResizeHandle();
			resizeHandle.addEventListener('dragstart', resizeDragStartListener);
			resizeHandle.addEventListener('dragend', resizeDragListener);
			ths[i].appendChild(resizeHandle);
		}
		return { add: addTr, columnSel: columnSel };
	};
});
