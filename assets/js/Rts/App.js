;(function($, angular, Poly2tri) {
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

			agent.model.watch(null, function(data) {
				this.data = data.new;
			});
			agent.walkable.model.watch(null, function(data) {
				this.data = data.new;
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

		game.events.on('game loop.update scopes', function() {
			$scope.$apply();
		});

		game.map.events
			.on('load map', function() {
				var edges = [],
					edge_groups = [];

				$.each(game.map.poly2tri.edge_list, function(i, edge) {

					if($.inArray(edge.p, edges) === -1) {
						edges.push(edge.p);
					}

					if($.inArray(edge.q, edges) === -1) {
						edges.push(edge.q);
					}
				});
				edges = $.map(edges, function(edge) {
					return {
						point: edge
					}
				});

				var group_start = 0;
				$.each(edges, function(i, edge) {
					if (!edge_groups[group_start]) {
						edge_groups[group_start] = [];
					}

					edge_groups[group_start].push(edge);

					// check if next edge if connected to the current one
					// if not, create new edge group and add into it
					if (edges[i + 1] && $.inArray(edges[i + 1].point, edge.point.connected_edges) === -1) {
						group_start++;
					}
				});
				
				$.extend(game.map, {
					data: {
						width: 1076,
						height: 632,
						triangles: getTriangles(),
						edges: edge_groups
					}
				});

				hero = Rts.AgentFactory.new('Imp', {
					id: 'hero',
					position: {
						x: 963,
						y: 415
					}
				}, game);

				hero.model.watch(['destination'], function() {
					var result = hero.walkable.mapDestinationPath,
						distance = 0;

					game.map.data.pathFound = result;
					/*$.each(result || [], function(i, item) {
						var next_point = result[i + 1];
						if (!next_point) return;

						distance += item.point.distance[next_point.point.index];
					});*/
					//$scope.$apply();
					//console.log('total distance:', distance);
				});

				/*imp1 = Rts.AgentFactory.new('Imp', {
					position: {
						x: 418,
						y: 48
					}
				}, game);*/

				//$scope.$apply();
			});

		game.map.loadMap('./assets/js/libraries/Rts/ASSETS/doom-RTS_navMesh.json');

		$(document).on('click', function(e) {
			var pos = new Poly2tri.Point(e.pageX, e.pageY),
				closest_pos = game.map.getClosestFromPos(pos),
				inside = true;

			// check if clicked pos is inside the triangle
			$.each(closest_pos.point.triangles, function(i, triangle) {
				inside = pos.inPolygon(triangle.getPoints());
				return !inside;  // break if at least 1 triangle matches the point inside in
			});
			
			hero.model.setData('destination', {
				x: (inside ? pos.x : closest_pos.point.x),
				y: (inside ? pos.y : closest_pos.point.y)
			});

			game.map.data.clickPos = [hero.walkable.mapClosestNode, closest_pos];
			/*console.clear();
			console.log(hero.walkable.mapClosestNode, closest_pos, game.map.data.clickPos	);*/
			//$scope.$apply();
		});

		console.log('para acessar $scope use a variavel global $scope');
		window.$scope = $scope;

	}]);
})(jQuery, angular, poly2tri);