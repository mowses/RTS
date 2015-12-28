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
						}),
						all_triangles;

					$.each(_polygons, function(i, polygon_coords) {
						var hole = [];

						$.each(polygon_coords, function(j, coord) {
							hole.push(new Poly2tri.Point(coord.x, coord.y));
						});

						swctx.addHole(hole);
					});

					self.poly2tri = swctx.triangulate();
					all_triangles = self.poly2tri.getTriangles();

					// add index to triangles
					$.each(all_triangles, function(i, triangle) {
						triangle.index = i;
					});

					// calculate point to point visibility and distances
					// also add the index property and triangles objects
					$.each(self.poly2tri.points_, function(i, point1) {
						var triangles = $.grep(all_triangles, function(triangle) {
								return (triangle.getPoints().indexOf(point1) >= 0);
							}),
							adjacent = $.map(triangles, function(triangle) {
								return $.grep(triangle.getPoints(), function(point) {
									return point != point1;
								});
							}),
							// filter duplicated adjacents
							// $.unique doesnt work
							adjacent = $.grep(adjacent, function(adj, i) {
								var arr = adjacent.slice(i + 1);
								return $.inArray(adj, arr) === -1;
							}),
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

				success: function(data) {
					polygons = data.polygons;
					self.events.trigger('load map');
				}
			});

			return this;
		}

		this.getClosestFromPos = function(pos) {
			var result = {
					triangle: null,
					point: null
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
					point: triangle_point
				});

				closest_dist = distance;
				if (distance == 0) return false; // break $.each
			});

			return result;
		}

		// http://drpexe.com/2011/07/a-star-with-navmesh-detailed/
		this.findPath = (function() {
			function getBestNode(list) {
				var closest_dist = Infinity,
					best_node = null;

				$.each(list.open, function(i, open) {
					if (list.closed[i]) return;
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
			/*function optimizePath(path) {
				var t = path.length - 1;

				for (var i = 0; i < t; i++) {
					var node1 = path[i];
					for (var j = t; j > i + 1; j--) {
						var node2 = path[j];
						if (node1.point.visibility[node2.index] !== true) continue;

						path.splice(i + 1, j - i - 1);
						t = path.length - 1;
						break;
					}
				}

				return path;
			}*/

			return function(start_position, end_position) {
				var start_triangles = start_position.point.triangles,
					end_triangles = end_position.point.triangles;

				// 1. Both points are located on the same triangle
				if (start_triangles == end_triangles) return null;

				// 2. One or both points are outside all triangles
				// actually this is not possible since we always have valid start_position and end_position

				// 3. Both points are located on different triangles
				var result = {
					closed: {},
					open: {}
				};

				// send all starting adjacent points to open list
				$.each(start_position.point.adjacent, function(i, adjacent) {
					var g = adjacent.distance[start_position.point.index],
						h = adjacent.distance[end_position.point.index];

					result.open[adjacent.index] = {
						point: adjacent,
						parent: start_position,
						distances: {
							g: g,
							h: h,
							f: g + h
						}
					};
				});
				// send the starting point to closed list
				result.closed[start_position.point.index] = start_position.point;

				var _i = 0,
					lowest_f_node;

				while(_i++ < 100) {
					lowest_f_node = getBestNode(result);
					// add the point to closed list
					result.closed[lowest_f_node.point.index] = lowest_f_node.point;

					// you know you are finished, the time that you add to the
					// closed list one of the vertices of the triangle that contains
					// the ending point
					if (end_position.triangle.containsPoint(lowest_f_node.point)) {
						console.log('DISCOVERED PATH', lowest_f_node);
						var final_path = (reconstructPath(lowest_f_node, []));
						console.log('FINAL PATH', final_path);
						return final_path;
					}

console.group();
console.log('lowest_f_node', lowest_f_node);
console.log('parent', lowest_f_node.parent);
					// process adjacent nodes
					$.each(lowest_f_node.point.adjacent, function(i, adjacent_point) {
						var adjacent_in_open_list = result.open[adjacent_point.index];

						
console.log(adjacent_point);
						// check if adjacent_point is already in open list
						if (adjacent_in_open_list) {
							// already in open list
							// check if the G cost from this new path is better than the former
							var step_cost = lowest_f_node.point.distance[adjacent_point.index] + lowest_f_node.distances.group;
							console.log('ADJACENT IN OPEN LIST ALREADY');
							console.log('step cost', step_cost);
							if ( step_cost < adjacent_in_open_list.distances.g) {
								console.log('WILL UPDATE parent');
								if (lowest_f_node.point.index == 60) {
									//console.log('lllllllllllllllll', );
								}
								adjacent_in_open_list.parent = lowest_f_node;
								adjacent_in_open_list.distances.g = step_cost;
								adjacent_in_open_list.distances.f = step_cost + adjacent_in_open_list.distances.h;
							}
						} else {
							var g = lowest_f_node.point.distance[lowest_f_node.parent.point.index] + lowest_f_node.point.distance[adjacent_point.index],
								h = adjacent_point.distance[end_position.point.index];
							//console.log(adjacent_point);
							// add adjacent to open list
							result.open[adjacent_point.index] = {
								point: adjacent_point,
								parent: lowest_f_node,
								distances: {
									g: g,
									h: h,
									f: g + h
								}
							};
						}
					});
console.groupEnd();
				}
				
				return null;
			};
		})();

		/**
		 * return the closest point from any position
		 */
		function getClosestPointFromPosition(pos) {
			var result = null,
				point = new Poly2tri.Point(pos.x, pos.y),
				triangles = self.poly2tri.getTriangles(),
				closest_dist = Infinity;

			$.each(triangles, function(i, triangle) {
				var triangle_point = getClosestPointFromTriangle(point, triangle),
					distance = getDistance(point, triangle_point);

				if (distance >= closest_dist) return;

				closest_dist = distance;
				result = {
					triangle: triangle,
					point: triangle_point
				};
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