(function($, Events, ObserverCore, Rts, Poly2tri, Intersection, Point2D) {

	$.extend(poly2tri.Point.prototype, {
		to2D: function() {
			return new Point2D(this.x, this.y);
		},

		lerp: function(point, percent) {
			var p1 = this.to2D(),
				p2 = point.to2D(),
				lerped = p1.lerp(p2, percent);

			return lerped.poly2Tri();
		},

		inPolygon: function(poly) {
			var pt = this;

			for (var c = false, i = -1, l = poly.length, j = l - 1; ++i < l; j = i)
				((poly[i].y <= pt.y && pt.y < poly[j].y) || (poly[j].y <= pt.y && pt.y < poly[i].y)) && (pt.x < (poly[j].x - poly[i].x) * (pt.y - poly[i].y) / (poly[j].y - poly[i].y) + poly[i].x) && (c = !c);

			return c;
		}
	});

	$.extend(Point2D.prototype, {
		poly2Tri: function() {
			return new poly2tri.Point(this.x, this.y);
		}
	});

	function Map(config) {
		var self = this,
			polygons = null;

		self.getClosestPointFromPosition = getClosestPointFromPosition;

		// functions
		function isPointInPoly(pt, poly) {
			for (var c = false, i = 0, l = poly.length, j = l - 2; i < l; i += 2, j = i - 2) {
				((poly[i + 1] <= pt[1] && pt[1] < poly[j + 1]) || (poly[j + 1] <= pt[1] && pt[1] < poly[i + 1])) && (pt[0] < (poly[j] - poly[i]) * (pt[1] - poly[i + 1]) / (poly[j + 1] - poly[i + 1]) + poly[i]) && (c = !c);
			}

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
				closest_dist = Infinity;

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
				model: new ObserverCore(),
				events: new Events([
					'load map'
				]),
				poly2tri: null
			});

			self.events
				.on('load map', function() {
					var swctx = new Poly2tri.SweepContext([]),
						_polygons = $.map(polygons, function(polygon) {
							return [$.map(polygon, function(coord) {
								return {
									x: Math.ceil(coord[0]),
									y: Math.ceil(coord[1])
								}
							})];
						});

					$.each(_polygons, function(i, polygon_coords) {
						var hole = [];

						$.each(polygon_coords, function(j, coord) {
							hole.push(new Poly2tri.Point(coord.x, coord.y));
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
							})),
							connected_edges = $.map(self.poly2tri.edge_list, function(edge) {
								if (edge.p == point1) return edge.q;
								if (edge.q == point1) return edge.p;
							}),
							edges = $.map(self.poly2tri.edge_list, function(edge) {
								if (edge.p == point1 || edge.q == point1) return edge;
							});

						$.extend(point1, {
							visibility: [],
							distance: [],
							midpoint: [],
							connected_edges: connected_edges,
							edges: edges,
							triangles: triangles,
							adjacent: adjacent,
							index: i
						});

						$.each(self.poly2tri.points_, function(j, point2) {
							var visible = true,
								distance = 0,
								midpoint = point1.lerp(point2, 0.5);

							if (i != j) {
								distance = getDistance(point1, point2);

								// check for edge obstacles from point1 to point2
								$.each(self.poly2tri.edge_list, function(ei, edge) {
									var intersects = Intersection.intersectLineLine(point1, point2, edge.p, edge.q);
									// remove point1, point2, and edges intersections from the result
									intersects.points = $.grep(intersects.points, function(point) {
										var point = new Poly2tri.Point(point.x, point.y);

										if (!point1.equals(point) && !point2.equals(point) && !edge.p.equals(point) && !edge.q.equals(point)) return true;
									});
									visible = !intersects.points.length;
									return visible;
								});
							}

							if (visible) {
								visible = false;

								// to continue visibility
								// the point must be inside at least 1 triangle
								$.each(self.poly2tri.getTriangles(), function(it, triangle) {
									var inside = midpoint.inPolygon(triangle.getPoints());

									if (inside) {
										visible = true;
										return false;
									}
								});
							}

							point1.midpoint[j] = midpoint;
							point1.visibility[j] = (point1.connected_edges.indexOf(point2) >= 0) || visible;
							point1.distance[j] = distance;
						});
					});
				});
		}

		/*this.getTerrainAt = function(position) {
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
		}*/

		this.loadMap = function(filepath) {
			$.ajax({
				url: filepath,
				dataType: 'json',
				cache: false,

				success: function (data) {
				    polygons = data.polygons;
					self.events.trigger('load map');
				}
			});
			
			return this;
		}

		this.getClosestFromPos = function(pos) {
			var result = {
					triangle: null,
					point: null,
					pointIndex: null
				},
				point = new Poly2tri.Point(pos.x, pos.y),
				triangles = self.poly2tri.getTriangles(),
				closest_dist = Infinity;

			$.each(triangles, function(i, triangle) {
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
				if (distance == 0) return false;  // break $.each
			});

			return result;
		}

		this.findPath = function(start_point, end_point) {
			var result = {
				closed: {},
				open: {}
			};

			result.open[start_point.index] = {
				point: start_point,
				parent: null,
				distances: getDistances(start_point)
			};

			function getVisiblePoints(node) {
				var result = {};

				$.each(node.point.visibility, function(j, visible) {
					if (!visible) return;

					var adjpoint = self.poly2tri.getPoint(j);
					if (adjpoint === node.point) return;

					result[adjpoint.index] = {
						point: adjpoint,
						parent: node,
						distances: getDistances(adjpoint)
					};
				});

				return result;
			}

			function getAdjacentPoints(node) {
				var result = {};

				$.each(node.point.adjacent, function(j, adjpoint) {
					result[adjpoint.index] = {
						point: adjpoint,
						parent: node,
						distances: getDistances(adjpoint)
					};
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
				var closest_dist = Infinity,
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

			/* remove unnecessary points from the path */
			function optimizePath(path) {
				var t = path.length - 1;

				for (var i = 0; i < t; i++) {
					var node1 = path[i];
					for (var j = t; j > i + 1; j--) {
						var node2 = path[j];
						if (node1.point.visibility[node2.point.index] !== true) continue;

						path.splice(i + 1, j - i - 1);
						t = path.length - 1;
						break;
					}
				}

				return path;
			}

			var _i = 0,
				current = null;

			while (Object.keys(result.open).length && _i++ <= 100) {

				current = getBestNode();
				if (current.point === end_point) {
					var path = optimizePath(reconstructPath(current, []));
					return path;
				}

				// remove current from openset
				delete result.open[current.point.index];

				// add current to closed set
				result.closed[current.point.index] = current.point;

				// always get the adjacent nodes
				// not the visible ones
				// if you want to optimize your path use `optimizePath()`
				$.each(getAdjacentPoints(current), function(i, visible) {
					// check for the visible in the closed set
					var in_closed = result.closed[visible.point.index] !== undefined;
					if (in_closed) return;

					// get current step and distance from current to visible point
					var step_cost = current.distances.g + current.point.distance[visible.point.index];
					// check if its cost is >= the step_cost, if so skip current visible point
					if (in_closed && step_cost >= visible.distances.g) return;

					// verify visible doesn't exist or new score for it is better
					var in_open = result.open[visible.point.index] !== undefined;

					if (!in_open || step_cost < visible.distances.g) {
						if (!in_open) {
							result.open[visible.point.index] = visible;
						} else {
							visible.parent = current;
							visible.distances.g = step_cost;
							visible.distances.f = step_cost + visible.distances.h;
						}
					}
				});
			}

			return;

		}

		/**
		 * return the closest point from any position
		 */
		function getClosestPointFromPosition(pos) {
			var result,
				point = new Poly2tri.Point(pos.x, pos.y),
				triangles = self.poly2tri.getTriangles(),
				closest_dist = Infinity;

			$.each(triangles, function(i, triangle) {
				var triangle_point = getClosestPointFromTriangle(point, triangle),
					distance = getDistance(point, triangle_point);

				if (distance >= closest_dist) return;

				closest_dist = distance;
				result = triangle_point;
			});

			return result;
		}

		init();
	};

	$.extend(Rts, {
		Map: Map
	});

	return Map;

})(jQuery, Events, ObserverCore, Rts, poly2tri, Intersection, Point2D);