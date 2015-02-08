(function($, Events, ObserverCore, Rts) {

	function AgentFactory() {
		var self = this;

		this.new = function(type, data, game) {
			var agent = new Rts.Agents[type](),
				walkable = new Rts.Walkable(agent, game);

			$.extend(agent, {
				walkable: walkable
			});

			agent.setData(data);
			self.registerAgent(agent);

			return agent;
		}
	}

	$.extend(AgentFactory.prototype, (function() {
		var instances = {};

		function generateID() {
			return new Date().getTime();
		}

		return {
			registerAgent: function(agent) {
				var id = agent.getData('id');

				if (!id) {
					id = generateID();

					agent.setData({
						id: id
					}, true);
				}

				instances[id] = agent;
			},

			getAgent: function(id) {
				if (id) return instances[id];
				return instances;
			}
		};
	})());

	$.extend(true, Rts, {
		AgentFactory: new AgentFactory()
	});

})(jQuery, Events, ObserverCore, Rts);