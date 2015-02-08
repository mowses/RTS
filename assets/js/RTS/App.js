'use strict';

angular.module('Rts', ['Rts.Agents', 'Rts.Map'])

.controller('AgentTest', ['$scope', function($scope) {

	var game = new Rts.Game(),
		agentFactoryNew = Rts.AgentFactory.new,
		hero = null,
		imp1 = null;

	$scope.game = game;

	Rts.AgentFactory.new = function() {
		var agent = agentFactoryNew.apply(this, arguments);

		agent.watch(null, function(data) {
			this.data = data.new;
			$scope.$apply();
		});

		game.agents = Rts.AgentFactory.getAgent();

		return agent;
	};

	function getTriangles() {
		var path = game.map.poly2tri,
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

	game.map.events
		.on('load map', function() {
			$.extend(game.map, {
				data: {
					width: 976,
					height: 532,
					triangles: getTriangles()
				}
			});

			hero = Rts.AgentFactory.new('Imp', {
				id: 'hero',
				position: [607, 333, 0]
			}, game)

			.watch(['destination'], function() {
				var result = hero.walkable.mapDestinationPath,
					distance = 0;

				game.map.data.pathFound = result;
				$.each(result, function(i, item) {
					var next_point = result[i + 1];
					if (!next_point) return;

					distance += item.point.distance[next_point.point.index];
				});
				$scope.$apply();
				//console.log('total distance:', distance);
			});

			imp1 = Rts.AgentFactory.new('Imp', {
				position: [418, 48, 0]
			}, game);

			$scope.$apply();
		});

	game.map.loadMap('./assets/js/libraries/RTS/ASSETS/doom-RTS_navMesh.json');

	$(document).on('click', function(e) {
		var pos = [e.pageX, e.pageY, 0],
			closest_pos = game.map.getClosestFromPos(pos),
			distance = 0;

		hero.setData({
			destination: pos
		}, true);

		game.map.data.clickPos = [hero.walkable.mapClosestNode, closest_pos];
		$scope.$apply();
	});

	console.log('para acessar $scope use a variavel global $scope');
	window.$scope = $scope;

}]);