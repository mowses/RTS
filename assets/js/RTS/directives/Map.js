'use strict';

angular.module('Rts.Map', [])

.directive('map', function() {
    return {
        restrict: 'E',
        transclude: true,
        scope: {
            map: '='
        },
        controller: ['$scope', '$element', function($scope, $element) {

            $scope.mouseCoords = [];

            $(document)
                .on('mousemove', function(e) {
                    $scope.mouseCoords = [e.pageX, e.pageY];
                    $scope.$apply();
                });

        }],
        templateUrl: './assets/js/libraries/Rts/templates/map.html',
        replace: true
    };
})

.directive('polygonPoints', function() {
    return {
        restrict: 'A',
        link: function($scope, $element, $attr) {
            $scope.$watch('triangle', function() {
                var points = [];

                $.each($scope.triangle, function(i, coords) {
                    points.push(coords);
                });

                $element.attr('points', points.join(' '));
            }, true);
        }
    };
})

.directive('path', function() {
    return {
        restrict: 'A',
        scope: {
            path: '='
        },
        link: function($scope, $element, $attr) {
            $scope.$watch('path', function() {
                var points = [],
                    path_pos = $scope.path,
                    lines = [];

                if (!path_pos) return;

                $.each(path_pos, function(i, node) {
                    lines.push('L' + node.point.x + ' ' + node.point.y);
                });

                $element.attr('d', 'M' + path_pos[0].point.x + ' ' + path_pos[0].point.y + ' ' + lines.join(' '));
            });
        }
    };
});