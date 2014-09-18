avct2.directive('clipTr', function() {
    return {
        restrict: 'A',
        link: function(scope, element) {
            scope.$watch(
                function(scope) {
                    return scope.trTemplateCompiled;
                }, function(value) {
                    value(scope, function(cloned) {
                        element.empty().append(cloned);
                    });
                }
            );
        }
    }
});

avct2.directive('thumbTd', function() {
    return {
        restrict: 'A',
        template: '<img ng-if="clip.thumbSet" ng-src="/clip/{{clip.id}}/thumb" />'
    }
});

avct2.directive('nameTd', function() {
    return {
        restrict: 'A',
        template: '{{clip.file | fileName}}'
    }
});

avct2.directive('studioTd', function() {
    return {
        restrict: 'A',
        template: '{{clip.studio}}'
    }
});

avct2.directive('raceTd', function() {
    return {
        restrict: 'A',
        template: '{{clip.race}}'
    }
});

avct2.directive('roleTd', function() {
    return {
        restrict: 'A',
        template: '{{clip.role | tagsJoin}}'
    }
});

avct2.directive('gradeTd', function() {
    return {
        restrict: 'A',
        template: '\
            <div class="progress">\
                <div class="progress-bar" style="width: {{clip.grade * 20}}%"></div>\
            </div>'
    }
});

avct2.directive('tagsTd', function() {
    return {
        restrict: 'A',
        template: '{{clip.tags | tagsJoin}}'
    }
});

avct2.directive('sizeTd', function() {
    return {
        restrict: 'A',
        template: '{{clip.size | humanReadableSize}}'
    }
});

avct2.directive('durationTd', function() {
    return {
        restrict: 'A',
        template: '{{clip.duration | durationInMinutes}}'
    }
});

avct2.directive('recordTd', function() {
    return {
        restrict: 'A',
        template: '{{clip.record}}'
    }
});