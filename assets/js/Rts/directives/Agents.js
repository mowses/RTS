;(function($, angular, Trigonometry) {
	'use strict';

	angular.module('Rts.Agents', [])

	.directive('agents', function() {
		return {
			restrict: 'E',
			transclude: true,
			scope: {
				agents: '='
			},
			controller: ['$scope', '$element', function($scope, $element) {
				$scope.getViewRotation = getViewRotation;
				/**
				 * return any of value 0,45,90,135,180,225,270 and 315
				 * depending on current radians pan orientation
				 */
				function getViewRotation(rad) {
					var deg = Trigonometry.radiansToDegrees(rad),
						deg = deg < 0 ? 360 + deg : deg;
					return Math.floor((((deg + 22.5) % 360) / 45)) * 45;
				}
			}],
			templateUrl: './assets/js/libraries/Rts/templates/agents.html',
			replace: true
		};
	});
})(jQuery, angular, Trigonometry);