(function($, Events, ObserverCore, Rts, Poly2tri, Intersection) {

	function Map(config) {
		var self = this,
			polygons = null;

		function isPointInPoly(poly, pt) {
			for (var c = false, i = 0, l = poly.length, j = l - 2; i < l; i += 2, j = i - 2) {
				((poly[i + 1] <= pt[1] && pt[1] < poly[j + 1]) || (poly[j + 1] <= pt[1] && pt[1] < poly[i + 1])) && (pt[0] < (poly[j] - poly[i]) * (pt[1] - poly[i + 1]) / (poly[j + 1] - poly[i + 1]) + poly[i]) && (c = !c);
			}

			return c;
		}

		function isPointInTriangle(pt, triangle) {
			poly = triangle.getPoints();

			for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
				((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y)) && (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) && (c = !c);

			return c;
		}

		function getTriangles() {
			var path = self.poly2tri,
				triangles = path.getTriangles(),
				result = [];

			$.each(triangles, function(i, triangle) {
				var points = triangle.getPoints(),
					triangle_points = [
						[points[0].x, points[0].y],
						[points[1].x, points[1].y],
						[points[2].x, points[2].y]
					];

				result.push(triangle_points);
			});

			return result;
		}

		function getDistance(p1, p2) {
			var x = p1.x - p2.x,
				y = p1.y - p2.y;

			return Math.sqrt(x * x + y * y);
		}

		function getClosestPointFromTriangle(point, triangle) {
			var closest_point = null,
				closest_dist = 999999;

			$.each(triangle.getPoints(), function(i, triangle_point) {
				var distance = getDistance(triangle_point, point); // always use getDistance

				if (distance >= closest_dist) return;

				closest_point = triangle_point;
				closest_dist = distance;
			});

			return closest_point;
		}

		function init() {
			$.extend(self, {
				events: new Events([
					'load map'
				]),
				poly2tri: null
			}, new ObserverCore());

			self.events
				.on('load map', function() {
					var swctx = new Poly2tri.SweepContext([]);

					$.each(polygons, function(i, polygon_coords) {
						var hole = [];

						$.each(polygon_coords, function(j, coord) {
							var x = Math.ceil(coord[0]),
								y = Math.ceil(coord[1]);

							hole.push(new Poly2tri.Point(x, y));
						});

						swctx.addHole(hole);
					});

					self.poly2tri = swctx.triangulate();

					// calculate point to point visibility and distances
					// also add the index property and triangles objects
					$.each(self.poly2tri.points_, function(i, point1) {
						var triangles = $.grep(self.poly2tri.getTriangles(), function(triangle) {
								return (triangle.getPoints().indexOf(point1) >= 0);
							}),
							adjacent = $.unique($.map(triangles, function(triangle) {
								return $.grep(triangle.getPoints(), function(point) {
									return point != point1;
								});
							}));

						$.extend(point1, {
							visibility: [],
							distance: [],
							triangles: triangles,
							adjacent: adjacent,
							index: i
						});

						$.each(self.poly2tri.points_, function(j, point2) {
							var visible = true,
								distance = 0;

							if (i != j) {
								distance = getDistance(point1, point2);

								$.each(self.poly2tri.edge_list, function(ei, edge) {
									var edges = [edge.p, edge.q];
									// edges points e points nao devem ser os mesmos
									if (edges.indexOf(point1) >= 0 || edges.indexOf(point2) >= 0) return;

									var intersects = Intersection.intersectLineLine(point1, point2, edge.p, edge.q);
									visible = !intersects.points.length;
									return visible;
								});
							}

							point1.visibility[j] = visible;
							point1.distance[j] = distance;
						});
					});
				});
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
				polygons = data.polygons;
				self.events.trigger('load map');
			});

			return this;
		}

		this.getClosestFromPos = function(pos) {
			var result = {
					triangle: null,
					point: null,
					pointIndex: null
				},
				point = new Poly2tri.Point(pos[0], pos[1]),
				triangles = self.poly2tri.getTriangles(),
				closest_dist = 99999999;

			$.each(triangles, function(i, triangle) {
				if (!isPointInTriangle(point, triangle)) return;

				var triangle_point = getClosestPointFromTriangle(point, triangle),
					distance = getDistance(point, triangle_point);

				if (distance >= closest_dist) return;

				$.extend(result, {
					triangle: triangle,
					triangleIndex: i,
					point: triangle_point,
					pointIndex: triangle.index(triangle_point)
				});

				closest_dist = distance;
			});

			return result;
		}

		this.findPath = function(start_point, end_point) {
			var result = {
				closed: [],
				open: [{
					point: start_point,
					distances: getDistances(start_point)
				}]
			};

			function getAdjacentPoints(node) {
				var result = [];

				$.each(node.point.adjacent, function(j, adjpoint) {
					result.push({
						point: adjpoint,
						parent: node,
						distances: getDistances(adjpoint)
					});
				});

				return result;
			}

			function getDistances(point) {
				//console.log('foo', open);
				var g = start_point.distance[point.index],
					h = end_point.distance[point.index];

				return {
					g: g,
					h: h,
					f: g + h
				};
			}

			function getBestNode() {
				var closest_dist = 9999999,
					best_node = null;

				$.each(result.open, function(i, open) {
					var f = open.distances.f;

					if (f >= closest_dist) return;
					closest_dist = f;
					best_node = open;
				});

				return best_node;
			}

			function reconstructPath(node, stack) {
				stack.push(node);

				if (node.parent) return reconstructPath(node.parent, stack);

				return stack;
			}

			var _i = 0,
				current = null;

			while (result.open.length && _i++ <= 100) {

				current = getBestNode();
				if (current.point === end_point) {
					var path = reconstructPath(current, []);
					console.log('path find:', result, path);
					return path;
				}

				// remove current from openset
				result.open = $.grep(result.open, function(open) {
					return open.point != current.point;
				});

				// add current to closed set
				result.closed.push(current.point);

				$.each(getAdjacentPoints(current), function(i, adjacent) {
					// check for the adjacent in the closed set
					var in_closed = (result.closed.indexOf(adjacent.point) >= 0);
					if (in_closed) return;

					// get current step and distance from current to adjacent point
					var step_cost = current.distances.g + current.point.distance[adjacent.point.index];

					// check if its cost is >= the step_cost, if so skip current adjacent point
					if (in_closed && step_cost >= adjacent.distances.g) return;

					// verify neighbor doesn't exist or new score for it is better
					var in_open = $.grep(result.open, function(open) {
						return open.point === adjacent.point;
					}).length > 0;
					if (!in_open || step_cost < adjacent.distances.g) {
						if (!in_open) {
							result.open.push(adjacent);
						} else {
							adjacent.parent = current;
							adjacent.distances.g = step_cost;
							adjacent.distances.f = step_cost + adjacent.distances.h;
						}
					}
				});
			}

			return;

		}

		init();
	};

	$.extend(Rts, {
		Map: Map
	});

	return Map;

})(jQuery, Events, ObserverCore, Rts, poly2tri, Intersection);