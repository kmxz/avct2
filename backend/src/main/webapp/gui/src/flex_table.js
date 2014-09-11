avct2.directive('flexTable', function($compile) {
    return {
        restrict: 'A',
        link: function(scope, element) {
            scope.trTemplateCompiled = null;
            var currentDrag;
            var insertBefore;
            var ths = element.find('th');
            var updateTrTemplate = function() {
                scope.trTemplateCompiled = $compile(ths.map(function() { 
                    return this.getAttribute('name');
                }).get().map(function(name) {
                    return '<td ' + name + '-td></td>';
                }).join());
            };
            ths.on('dragover', function(ev) {
                ev.preventDefault();
                if (!currentDrag) { return; }
                ths.removeClass();
                insertBefore = currentDrag.nextElementSibling;
                var currentDragover = ev.target;
                var $currentDragover = angular.element(currentDragover);
                if (currentDragover === currentDrag) { return; }
                if (ev.originalEvent.offsetX > ev.target.offsetWidth / 2) {
                    // to the right
                    if (currentDrag.previousElementSibling !== currentDragover) {
                        $currentDragover.addClass('shadow-right');
                        $currentDragover.next().addClass('shadow-left');
                        insertBefore = currentDragover.nextElementSibling;
                    }
                } else {
                    // to the left
                    if (currentDrag.nextElementSibling !== currentDragover) {
                        $currentDragover.addClass('shadow-left');
                        $currentDragover.prev().addClass('shadow-right');
                        insertBefore = currentDragover;
                    }
                }
            }).on('drag', function(ev) {
                currentDrag = ev.target;
                insertBefore = currentDrag.nextElementSibling;
            }).on('drop', function(ev) {
                ev.preventDefault();
                if (!currentDrag) { return; }
                ths.removeClass();
                currentDrag.parentNode.insertBefore(currentDrag, insertBefore);
                currentDrag = null;
                ths = element.find('th'); // re-init with the new order
                scope.$apply(updateTrTemplate);
            });
            updateTrTemplate();
        }
    }
});