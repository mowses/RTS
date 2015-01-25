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
                        width: 976,
                        height: 532
                    })
                    .loadMap('./assets/js/libraries/RTS/ASSETS/doom-RTS_navMesh.json')
                    .watch(null, function(data) {
                        this.data = data.new;
                        $scope.$apply();
                    })
            };

           /* $element.on('click', function(e) {
                var mouse_pos = [e.pageX, e.pageY],
                    terrain = $scope.Rts.map.getTerrainAt(mouse_pos);

                console.log('terrain type at', mouse_pos, ' is:', terrain);
            });*/

            console.log('para acessar $scope use a variavel global $scope');
            window.$scope = $scope;

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
});