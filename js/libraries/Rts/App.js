'use strict';

angular.module('Rts', [])

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

            $scope.Rts = {
                map: new Rts.Map()
                    .setData({
                        width: 800,
                        height: 600,
                        terrain: {
                            grass: [
                                [
                                    0,
                                    0,
                                    400,
                                    0,
                                    400,
                                    300,
                                    380,
                                    200,
                                    350,
                                    200,
                                    200,
                                    100,
                                    150,
                                    200,
                                    400,
                                    300,
                                    0,
                                    300
                                ],
                                [
                                    200,
                                    350,
                                    300,
                                    400,
                                    250,
                                    500
                                ]
                            ],

                            sand: [
                                [
                                    500,
                                    100,
                                    800,
                                    100,
                                    500,
                                    400
                                ],
                                [
                                    100,
                                    400,
                                    300,
                                    350,
                                    200,
                                    450
                                ]
                            ]
                        },

                    })
                    .watch(null, function(data) {
                        this.data = data.new;
                        $scope.$apply();
                    })
            };

            $element.on('mousemove', function(e) {
                var mouse_pos = [e.pageX, e.pageY],
                    terrain = $scope.Rts.map.getTerrainAt(mouse_pos);

                console.log('terrain type at', mouse_pos, ' is:', terrain);
            });

            console.log('para acessar $scope use a variavel global $scope');
            window.$scope = $scope;

        }],
        templateUrl: './js/libraries/Rts/templates/map.html',
        replace: true
    };
})

.directive('polygonPoints', function() {
    return {
        restrict: 'A',
        link: function($scope, $element, $attr) {
            $scope.$watch('terrain', function() {
                var points = [],
                    polygons = $scope.terrain;

                for (var i = 0, t = polygons.length; i < t; i += 2) {
                    points.push(polygons[i] + ',' + polygons[i + 1]);
                }

                $element.attr('points', points.join(' '));
            }, true);
        }
    };
});