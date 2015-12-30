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
				angle = agent_data.orientation;

			agent_data.position.x += reldist.x * Math.sin(angle.pan);
			agent_data.position.y -= reldist.x * Math.cos(angle.pan);
		}

		function stopAgent() {
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
			})

			/*.watch(['target'], function(data) {
				console.log('changed target to', data.new.target);
			})*/
			;

			game.events
				// follow path
				.on('game loop.move to path target', function() {
					var data = self.model.getData();

					if (!data.target) return;

					var agent_data = agent.model.getData(),
						distance,
						velocity_length;

					//http://gamedevelopment.tutsplus.com/tutorials/understanding-steering-behaviors-path-following--gamedev-8769
					//http://gamedevelopment.tutsplus.com/tutorials/understanding-steering-behaviors-seek--gamedev-849
					rotateTo(data.target);
					move();

					distance = Trigonometry.vecDist(agent_data.position, data.target);
					velocity_length = Trigonometry.vecDist({x:0, y:0}, agent_data.velocity);
					if (distance > velocity_length) return;

					self.mapCurrentNodePathIndex++;
					if (self.mapCurrentNodePathIndex >= total_path_nodes) {
						// reached path end
						data.target = null;
						return;
					}

					// set another node point in the path as target
					data.target = {
						x: self.mapDestinationPath[self.mapCurrentNodePathIndex].point.x,
						y: self.mapDestinationPath[self.mapCurrentNodePathIndex].point.y
					};
				})
				// after followed the path, go straight to the destination
				.on('game loop.move to destination', function() {
					var data = self.model.getData();

					if (data.target) return;  // data.target are for paths

					var agent_data = agent.model.getData();
					if (!agent_data.destination) return;

					var distance,
						velocity_length;

					rotateTo(agent_data.destination);
					move();

					distance = Trigonometry.vecDist(agent_data.position, agent_data.destination);
					velocity_length = Trigonometry.vecDist({x:0, y:0}, agent_data.velocity);
					if (distance > velocity_length) return;

					// agent reached destination
					agent_data.destination = null;


				});

			agent.model
				.setData({
					position: null,
					orientation: {
						pan: null
					},
					velocity: null,
					destination: null
				})

			.watch(['destination'], function(data) {
				// get the destination triangle instead of directly the closest point
				// because it leads to get wrong point/triangle if another point is closest from destination
				var destination_position = data.new.destination,  // can be any arbitrary position
					destination_point,
					destination_triangle;

				self.model.setData('animation', destination_position ? 'walking' : null);
				if (!destination_position || !self.mapClosestNode) {
					stopAgent();
					return;
				}

				destination_point = new Poly2tri.Point(destination_position.x, destination_position.y);

				// get destination triangle
				$.each(game.map.poly2tri.getTriangles(), function(i, triangle) {
					if (!destination_point.inPolygon(triangle.getPoints())) return;
					destination_triangle = triangle;
					return false;
				});

				// now get the destination node
				if (!destination_triangle) {
					self.mapDestinationNode = game.map.getClosestFromPos(destination_point).point;
				} else {
					self.mapDestinationNode = game.map.getClosestPointOfTriangle(destination_point, destination_triangle);
				}
				
				self.mapDestinationPath = game.map.findPath(self.mapClosestNode, self.mapDestinationNode);
				
				if (!self.mapDestinationPath) {
					stopAgent();
					return;
				}

				self.mapCurrentNodePathIndex = 0;
				total_path_nodes = self.mapDestinationPath.length;

				var agent_data = agent.model.getData(),
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
				pan: -Trigonometry.vecToAngle(agent.model.getData('position'), position).radians + 1.5707963267948966  // + 90 deg
			});
		}

		function move() {
			var agent_data = agent.model.getData(),
				agent_config = agent.getConfig();

			agent_data.velocity = {
				x: agent_config.MAX_VELOCITY,
				y: 0
			};

			entMove(agent_data.velocity);
		}

		init();
	}

	$.extend(true, Rts, {
		Walkable: Walkable
	});

})(jQuery, Events, ObserverCore, Rts, Trigonometry, poly2tri);