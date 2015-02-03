'use strict';

angular.module('Rts', [])

.filter('join', function() {
    return function(arr, joiner) {
        if (!arr) return;

        return arr.join(joiner);
    }
})

.filter('min', function() {
    return function(number, max) {
        return Math.min(number, max);
    }
})

.directive('map', function() {
    return {
        restrict: 'E',
        transclude: true,
        controller: ['$scope', '$element', function($scope, $element) {

            function getTriangles() {
                var path = $scope.Rts.map.poly2tri,
                    triangles = path.getTriangles(),
                    result = [];

                $.each(triangles, function(i, triangle) {
                    var points = triangle.getPoints(),
                        triangle_points = [
                            [points[0].x, points[0].y],
                            [points[1].x, points[1].y],
                            [points[2].x, points[2].y]
                        ];

                    result.push(triangle_points);
                });

                return result;
            }

            $scope.Rts = {
                map: $.extend(true, new Rts.Map(), {
                    data: {}
                })
            };

            $scope.Rts.map.events
                .on('load map', function() {
                    var poly2tri = $scope.Rts.map.poly2tri;

                    $.extend($scope.Rts.map.data, {
                        width: 976,
                        height: 532,
                        triangles: getTriangles()
                    });
                    $scope.$apply();
                });

            $scope.Rts.map.loadMap('./assets/js/libraries/RTS/ASSETS/doom-RTS_navMesh.json');


            /* $element.on('click', function(e) {
                 var mouse_pos = [e.pageX, e.pageY],
                     terrain = $scope.Rts.map.getTerrainAt(mouse_pos);

                 console.log('terrain type at', mouse_pos, ' is:', terrain);
             });*/

            console.log('para acessar $scope use a variavel global $scope');
            window.$scope = $scope;

            var $coords = $('<div></div>').css({
                    position: 'fixed',
                    right: 0,
                    padding: 10,
                    background: 'salmon'
                }).prependTo('body'),
                clicks = 0;

            $scope.Rts.map.data.clickPos = [];
            $(document)
                .on('mousemove', function(e) {
                    $coords.html('mouse pos: ' + e.pageX + ', ' + e.pageY);
                })
                .on('click', function(e) {
                    var pos = [e.pageX, e.pageY],
                        clickpos = $scope.Rts.map.data.clickPos;
                    clickpos[clicks++ % 2] = $scope.Rts.map.getClosestFromPos(pos);

                    if (clickpos[0] && clickpos[1]) {
                        var result = $scope.Rts.map.findPath(clickpos[0].point, clickpos[1].point);
                        $scope.Rts.map.data.pathPos = result;
                    }

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
        link: function($scope, $element, $attr) {
            $scope.$watch('Rts.map.data.pathPos', function() {
                var points = [],
                    path_pos = $scope.Rts.map.data.pathPos,
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