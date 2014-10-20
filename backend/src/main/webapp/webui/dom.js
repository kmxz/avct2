ijkl.module('dom', ['es5Array'], function() {
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
	var create = function(tag, options, children) {
		var add = function(child) {
			if (child instanceof HTMLElement) {
				element.appendChild(child);
			} else if (child) {
				element.appendChild(document.createTextNode(child));
			}
		};
		var element = document.createElement(tag);
		if (options) {
			set(element, options);
		}
		if (children instanceof Array) {
			children.forEach(add);
		} else {
			add(children);
		}
		return element;
	};
	create.set = set;
	return create;
});
