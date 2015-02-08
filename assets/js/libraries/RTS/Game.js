(function($, Events, ObserverCore, Rts) {

	function Game() {
		var self = this,
			interval = null,
			update_freq = 100;

		this.map = new Rts.Map();

		function init() {
			$.extend(self, {
				events: new Events([
					'game loop'
				])
			});

			interval = setInterval(function(events) {
				events.trigger('game loop');
				console.log('game loop');
			}, update_freq, self.events);
		}

		init();
	}

	$.extend(true, Rts, {
		Game: Game
	});

	return Game;

})(jQuery, Events, ObserverCore, Rts);