(function($, Events, ObserverCore, Rts) {

	function Imp() {
		var self = this;

		function init() {
			$.extend(self,
				new ObserverCore(), {
				events: new Events([

				])
			});

			self.events
				/*.on('set destination', function() {
					console.log('Imp sets destination');
				})
				.on('reach destination', function() {
					console.log('Imp reaches destination');
				});*/
		}

		init();
	}

	$.extend(Imp.prototype, (function() {
		return {
			getConfig: function() {
				return {
					MAX_VELOCITY: 5,
					ACCELERATION: 0.5,
					DECCELERATION: 0.5
				};
			}
		};
	})());

	$.extend(true, Rts, {
		Agents: {
			Imp: Imp
		}
	});

	return Imp;

})(jQuery, Events, ObserverCore, Rts);