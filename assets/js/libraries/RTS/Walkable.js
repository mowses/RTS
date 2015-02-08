(function($, Events, ObserverCore, Rts) {

	function Walkable(agent, game) {
		var self = this;

		this.mapClosestNode = null;
		this.mapDestinationNode = null;
		this.mapDestinationPath = null;


		function init() {
			$.extend(self, new ObserverCore());

			self.setData({
				target: null
			})

			.watch(['target'], function(data) {
				console.log('changed target to', data.new.target);
			});

			agent
				.setData({
					position: null,
					destination: null
				}, true)

				.watch(['destination'], function(data) {
					self.mapDestinationNode = game.map.getClosestFromPos(data.new.destination);
					self.mapDestinationPath = game.map.findPath(self.mapClosestNode.point, self.mapDestinationNode.point);

					if (!self.mapDestinationPath) return;
					var len = self.mapDestinationPath.length - 1;

					self.setData({
						target: [self.mapDestinationPath[len].point.x, self.mapDestinationPath[len].point.y]
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

})(jQuery, Events, ObserverCore, Rts);