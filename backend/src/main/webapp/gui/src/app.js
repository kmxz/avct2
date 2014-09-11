var avct2 = angular.module('avct2', ['ngRoute']);

avct2.config(function($routeProvider) {
    $routeProvider.when('/', {
        templateUrl: 'src/main_window.html',
        controller: 'MainWindow'
    }).when('/tags', {
        templateUrl: 'src/tag_manager.html',
        controller: 'TagManager'
    });
});