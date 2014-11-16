"use strict";

ijkl.module('dom', ['es5Array', 'matches'], function() {
	var set = function(element, options) {
		var i, j, v;
		for (i in options) {
			v = options[i];
			if (i === 'style') {
				for (j in v) {
					element.style[j] = v[j];
				}
			} else if (i === 'className') {
				if (options.className instanceof Array) {
					element.className = options.className.join(' ');
				} else {
					element.className = options.className;
				}
			} else {
				element.setAttribute(i, v);
			}
		}
	};

	var append = function(element, children) {
		var add = function(child) {
			if (child instanceof HTMLElement) {
				element.appendChild(child);
			} else if (child) {
				element.appendChild(document.createTextNode(child));
			}
		};
		if (children instanceof Array) {
			children.forEach(add);
		} else {
			add(children);
		}
	};

	var create = function(tag, options, children) {
		var element = document.createElement(tag);
		if (options) {
			set(element, options);
		}
		append(element, children);
		return element;
	};

	create.append = append;
	create.set = set;
	create.match = function(selector) {
		return function(el) { return (el instanceof HTMLElement) && el.matches(selector); }
	};
	create.getParent = function(node, filter) {
		var cur = node;
		while (cur) {
			cur = cur.parentNode;
			if (filter(cur)) {
				return cur;
			}
		}
		return null;
	};
	return create;
});
