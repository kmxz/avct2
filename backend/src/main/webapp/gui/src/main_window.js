avct2.controller('MainWindow', function($scope, sources) {
    $scope.clips = [];
    $scope.studios = [];
    $scope.tags = [];
    $scope.reloading = true; // initialization
    $scope.reload = function() { // load all three components
        $scope.reloading = true;
        // TODO: also fetch quickjerk, require both success to proceed
        sources('clip/list').success(function(i) {
            $scope.clips = i;
            $scope.reloading = false;
        });
    }
    $scope.reload();
});

avct2.constant('availRaces', ['Chinese', 'Other Asian', 'Other races']);
avct2.constant('availRoles', ['Vanilla', 'M self', 'F self', 'M/m', 'M/f', 'F/m', 'F/f']);