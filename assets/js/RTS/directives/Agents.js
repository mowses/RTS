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

		}],
		templateUrl: './assets/js/libraries/Rts/templates/agents.html',
		replace: true
	};
});