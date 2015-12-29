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
            $scope.customPath = [];
            $scope.distance = 0;

            $scope.$watchCollection('customPath', function(custompath) {
                var distance = 0;

                $.each(custompath, function(i, p) {
                    var next = custompath[i + 1];
                    if (!next) return;

                    distance += p.point.distance[next.point.index];
                });

                $scope.distance = distance;
            });

            $(document)
                .on('mousemove', function(e) {
                    $scope.mouseCoords = [e.pageX, e.pageY];
                    $scope.closestnode = $scope.$parent.game.map.getClosestPointFromPosition({
                        x: $scope.mouseCoords[0],
                        y: $scope.mouseCoords[1]
                    });
                })
                .on('keyup', function(event) {
                    console.log(event.which);
                    if (event.which === 107) {  // 107: '+' key
                        $scope.customPath.push($scope.closestnode);
                    }
                    if (event.which === 109) {  // 109: '-' key
                        $scope.customPath.pop();
                    }
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