(function($, Events, ObserverCore, Rts, Trigonometry) {

	function Walkable(agent, game) {
		var self = this;

		this.mapClosestNode = null;
		this.mapDestinationNode = null;
		this.mapDestinationPath = null;
		this.mapCurrentNodePathIndex = null;

		function entMove(reldist) {
			var agent_data = agent.getData(),
				angle = agent_data.orientation;

			agent_data.position.x += reldist.x * Math.cos(angle.pan);
			agent_data.position.y -= reldist.x * Math.sin(angle.pan);
		}


		function init() {
			$.extend(self, new ObserverCore());

			self.setData({
				target: null
			})

			/*.watch(['target'], function(data) {
				console.log('changed target to', data.new.target);
			})*/
			;

			game.events
				.on('game loop.go to target', function() {
					var data = self.getData(),
						agent_data,
						agent_config,
						distance;

					if (!data.target) return;

					agent_data = agent.getData();
					agent_config = agent.getConfig();

					//http://gamedevelopment.tutsplus.com/tutorials/understanding-steering-behaviors-path-following--gamedev-8769
					//http://gamedevelopment.tutsplus.com/tutorials/understanding-steering-behaviors-seek--gamedev-849
					/*agent_data.velocity = {
						x: Trigonometry.normalize() * agent_config.MAX_VELOCITY
					};*/

					/*agent.extendData({
						orientation: {
							pan: Trigonometry.vecToAngle(agent_data.position, data.target).radians
						}
					});*/

					/*entMove({
						x: 1,
						y: 0
					});*/

					agent_data = agent.getData();
					distance = Trigonometry.vecDist(agent_data.position, data.target);
					if (distance > 10) return;

					self.mapCurrentNodePathIndex--;
					if (self.mapCurrentNodePathIndex < 0) {
						// reached destination
						data.target = null;
						return;
					}

					// set another node point in the path as target
					data.target = {
						x: self.mapDestinationPath[self.mapCurrentNodePathIndex].point.x,
						y: self.mapDestinationPath[self.mapCurrentNodePathIndex].point.y
					};
				});

			agent
				.setData({
					position: null,
					orientation: {
						pan: null
					},
					velocity: null,
					destination: null
				}, true)

			.watch(['destination'], function(data) {
				self.mapDestinationNode = game.map.getClosestFromPos(data.new.destination);
				if (!self.mapDestinationNode.point || !self.mapClosestNode.point) {
					self.setData({
						target: null
					}, true);
					return;
				}

				self.mapDestinationPath = game.map.findPath(self.mapClosestNode.point, self.mapDestinationNode.point);

				if (!self.mapDestinationPath) return;

				self.mapCurrentNodePathIndex = self.mapDestinationPath.length - 1;

				var agent_data = agent.getData(),
					target = {
						x: self.mapDestinationPath[self.mapCurrentNodePathIndex].point.x,
						y: self.mapDestinationPath[self.mapCurrentNodePathIndex].point.y
					};

				self.setData({
					target: target
				}, true);
			})

			.watch(['position'], function(data) {
				self.mapClosestNode = game.map.getClosestFromPos(data.new.position);
			});

		}

		init();
	}

	$.extend(true, Rts, {
		Walkable: Walkable
	});

})(jQuery, Events, ObserverCore, Rts, Trigonometry);