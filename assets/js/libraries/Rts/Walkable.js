(function($, Events, ObserverCore, Rts, Trigonometry, Poly2tri) {

	function Walkable(agent, game) {
		var self = this,
			total_path_nodes = null;

		this.mapClosestNode = null;
		this.mapDestinationNode = null;
		this.mapDestinationPath = null;
		this.mapCurrentNodePathIndex = null;

		function entMove(reldist) {
			var agent_data = agent.model.getData(),
				reldist = Trigonometry.vecForAngle(reldist, agent_data.orientation);

			agent_data.position.x += reldist.x;
			agent_data.position.y += reldist.y;
		}

		function unsetTarget() {
			self.mapDestinationNode = null;
			self.mapDestinationPath = null;
			self.mapCurrentNodePathIndex = null;
			self.model.setData('target', null);
		}


		function init() {
			$.extend(self, {
				model: new ObserverCore()
			});

			self.model.setData({
				target: null,
				animation: null
			}).apply()

			/*.watch(['target'], function(data) {
				console.log(data.new.target, data.old.target);
				alert('x');
				console.log('changed target to', data.new.target);
			})*/
			;

			game.events
				.on('game loop.animate', function() {
					var agent_data = agent.model.getData();
					self.model.setData('animation', agent_data.destination ? 'walking' : null);
				})
				// follow path
				.on('game loop.move to path target', function() {
					var data = self.model.getData();

					if (!data.target) return;

					var agent_data = agent.model.getData(),
						agent_config = agent.getConfig(),
						distance,
						next_node;

					//http://gamedevelopment.tutsplus.com/tutorials/understanding-steering-behaviors-path-following--gamedev-8769
					//http://gamedevelopment.tutsplus.com/tutorials/understanding-steering-behaviors-seek--gamedev-849

					// ignore nodes that are closer to agent
					do {
						distance = Trigonometry.vecDist(agent_data.position, data.target);
						if (distance < agent_config.WALK_VELOCITY) { // reached a node
							self.mapCurrentNodePathIndex++;
							next_node = self.mapDestinationPath[self.mapCurrentNodePathIndex];
							if (!next_node) break;

							data.target = {
								x: next_node.point.x,
								y: next_node.point.y
							};

							rotateTo(data.target);
						}

						break;
					} while (data.target);

					if (self.mapCurrentNodePathIndex >= total_path_nodes) {
						// reached path end
						unsetTarget();
						return;
					}

					entMove({
						x: agent_config.WALK_VELOCITY,
						y: 0
					});

				})
				// after followed the path, go straight to the destination
				.on('game loop.move to destination', function() {
					var data = self.model.getData();

					if (data.target) return; // data.target are for paths

					var agent_data = agent.model.getData();
					if (!agent_data.destination) return;

					var distance,
						agent_config = agent.getConfig();

					rotateTo(agent_data.destination);
					
					distance = Trigonometry.vecDist(agent_data.position, agent_data.destination);
					if (distance > agent_config.WALK_VELOCITY) {
						entMove({
							x: agent_config.WALK_VELOCITY,
							y: 0
						});

						return;
					}

					// agent reached destination
					agent_data.destination = null;

				})
				/*.on('game loop.apply forces', function() {  // decidido por comentar isso pq questoes de performance futura
					var agent_data = agent.model.getData();
					if (!agent_data.velocity) return;

					var xmult = agent_data.velocity.x < 0 ? -1 : 1,
						ymult = agent_data.velocity.y < 0 ? -1 : 1,
						math = Math;

					entMove();
					// deceleration
					agent_data.velocity.x = math.max(0, math.abs(agent_data.velocity.x) - 2) * xmult;
					agent_data.velocity.y = math.max(0, math.abs(agent_data.velocity.y) - 2) * ymult;
				})*/;

			agent.model
				.setData({
					position: null,
					orientation: {
						pan: null
					},
					velocity: {
						x: 0,
						y: 0
					},
					destination: null
				}).apply() // apply to prevent double running watches

			.watch(['destination'], function(data) {
				if (!data.new.destination) {
					unsetTarget();
					return;
				}
				// get the destination triangle instead of directly the closest point
				// because it leads to get wrong point/triangle if another point is closest from destination
				var destination_position = data.new.destination, // can be any arbitrary position
					destination_point = new Poly2tri.Point(destination_position ? destination_position.x : null, destination_position ? destination_position.y : null),
					destination_triangle = game.map.getTriangleFromPosition(destination_point),
					agent_data = agent.model.getData(),
					agent_starting_point = new Poly2tri.Point(agent_data.position.x, agent_data.position.y),
					target;

				// now get the destination node
				if (!destination_triangle) {
					self.mapDestinationNode = game.map.getClosestFromPos(destination_point).point;
				} else {
					self.mapDestinationNode = game.map.getClosestPointOfTriangle(destination_point, destination_triangle);
				}

				self.mapDestinationPath = game.map.findPath(self.mapClosestNode, self.mapDestinationNode);
				self.mapDestinationPath = game.map.optimizePath(self.mapDestinationPath, agent_starting_point, destination_point);

				if (!self.mapDestinationPath) {
					unsetTarget();
					return;
				}

				self.mapCurrentNodePathIndex = 0;
				total_path_nodes = self.mapDestinationPath.length;

				target = {
					x: self.mapDestinationPath[self.mapCurrentNodePathIndex].point.x,
					y: self.mapDestinationPath[self.mapCurrentNodePathIndex].point.y
				};

				self.model.setData('target', target);
			})

			.watch(['position'], function(data) {
				var position = data.new.position,
					triangle = game.map.getTriangleFromPosition(position);

				if (!triangle) {
					self.mapClosestNode = game.map.getClosestFromPos(data.new.position).point;
				} else {
					self.mapClosestNode = game.map.getClosestPointOfTriangle(position, triangle);
				}
			});

		}

		/**
		 * set agent orientation to the passed position
		 */
		function rotateTo(position) {
			agent.model.setData('orientation', {
				pan: -Trigonometry.vecToAngle(agent.model.getData('position'), position).radians + 1.5707963267948966 // + 90 deg
			});
		}

		init();
	}

	$.extend(true, Rts, {
		Walkable: Walkable
	});

})(jQuery, Events, ObserverCore, Rts, Trigonometry, poly2tri);