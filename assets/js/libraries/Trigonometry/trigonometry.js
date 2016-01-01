(function($) {

	var Trigonometry = {

		degreesToRadians: function(angle) {
			return angle * (Math.PI / 180);
		},

		radiansToDegrees: function(radians) {
			return radians * (180 / Math.PI);
		},

		vecToAngle: function(vec1, vec2) {
			var radians = Math.atan2(vec1.y - vec2.y, vec2.x - vec1.x);

			return {
				radians: radians,
				cos: Math.cos(radians),
				sin: Math.sin(radians)
			};
		},

		// return the distance between two 2d positions
		vecDist: function(vec1, vec2) {
			var math = Math,
				diff = {
					x: math.abs(vec2.x - vec1.x),
					y: math.abs(vec2.y - vec1.y)
				};

			return math.sqrt(math.pow(diff.x, 2) + math.pow(diff.y, 2));
		},

		vecLength: function(vec) {
			return Trigonometry.vecDist({
				x: 0,
				y: 0
			}, vec);
		},

		/**
		 * calculates the rotated vector using angle
		 * this method is useful to set forces relative to the agent
		 * like entMove(reldist)
		 */
		vecForAngle: function(vec, angle) {
			return {
				x: vec.x * Math.sin(angle.pan) - vec.y * Math.cos(angle.pan),
				y: vec.y * Math.sin(angle.pan) - vec.x * Math.cos(angle.pan)
			};
		},

		vecRotate: function(vec, angle) {
			var a = angle.pan,
				b = angle.tilt,
				c = angle.roll,
				x,
				y = vec.y,
				z = vec.z;

			vec.y = y * Math.cos(a) + z * Math.sin(a);
			vec.z = z * Math.cos(a) - y * Math.sin(a);

			x = vec.x;
			z = vec.z;
			vec.x = x * Math.cos(b) - z * Math.sin(b);
			vec.z = z * Math.cos(b) + x * Math.sin(b);

			x = vec.x;
			y = vec.y;
			vec.x = x * Math.cos(c) + y * Math.sin(c);
			vec.y = y * Math.cos(c) - x * Math.sin(c);

			return vec;
		}
	};

	// Node: Export function
    if (typeof module !== 'undefined' && module.exports) {
        module.exports.Trigonometry = Trigonometry;
    }
    // AMD/requirejs: Define the module
    else if (typeof define === 'function' && define.amd) {
        define(function() {
            return {
                Trigonometry: Trigonometry
            };
        });
    }
    // Browser: Expose to window
    else {
        window.Trigonometry = Trigonometry;
    }

	return Trigonometry;

})(jQuery);