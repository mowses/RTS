(function($, Events, ObserverCore, Rts) {

	function Imp() {
		var self = this;

		function init() {
			$.extend(self, {
				model: new ObserverCore(),
				events: new Events([])
			});

			self.events
				/*.on('set destination', function() {
					console.log('Imp sets destination');
				})
				.on2('reach destination', function() {
					console.log('Imp reaches destination');
				});*/
		}

		init();
	}

	$.extend(Imp.prototype, (function() {
		return {
			getConfig: function() {
				return {
					MAX_VELOCITY: 10
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