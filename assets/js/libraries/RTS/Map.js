(function($, Events, ObserverCore, Rts) {

	var Map = function(config) {
		var self = this;

		$.extend(this, {}, new ObserverCore());

		function isPointInPoly(poly, pt) {
			for (var c = false, i = 0, l = poly.length, j = l - 2; i < l; i += 2, j = i - 2) {
				((poly[i + 1] <= pt[1] && pt[1] < poly[j + 1]) || (poly[j + 1] <= pt[1] && pt[1] < poly[i + 1])) && (pt[0] < (poly[j] - poly[i]) * (pt[1] - poly[i + 1]) / (poly[j + 1] - poly[i + 1]) + poly[i]) && (c = !c);
			}

			return c;
		}

		function init() {

		}

		this.getTerrainAt = function(position) {
			var data = this.getData(),
				terrain;

			$.each(data.terrain, function(terrain_type, terrain_pieces) {
				$.each(terrain_pieces, function(i, piece) {
					if (!isPointInPoly(piece, position)) return;

					terrain = {};
					terrain[terrain_type] = piece;

					return false;
				});

				return !terrain;
			});

			return terrain;
		}

		this.loadMap = function(filepath) {
			$.get(filepath, function(data) {
				self.extendData(data);
			});

			return this;
		}

		init();
	};

	$.extend(Rts, {
		Map: Map
	});

	return Map;

})(jQuery, Events, ObserverCore, Rts);