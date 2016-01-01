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
		self.getClosestPointOfTriangle = getClosestPointOfTriangle;
		self.getTriangleFromPosition = getTriangleFromPosition;
		self.optimizePath = optimizePath;
		self.isVisible = isVisible;

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

		/**
		 * return the closest point from the passed triangle
		 */
		function getClosestPointOfTriangle(point, triangle) {
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

		/**
		 * get the triangulation from an arbitrary position
		 */
		function getTriangleFromPosition(position) {
			var point = new Poly2tri.Point(position.x, position.y),
				triangle = null;

			// get the clicked triangle instead of closest point
			// because it leads to get wrong point/triangle if another point is closest from position
			$.each(self.poly2tri.getTriangles(), function(i, _triangle) {
				if (!point.inPolygon(_triangle.getPoints())) return;
				triangle = _triangle;
				return false;
			});

			return triangle;
		}

		/**
		 * return point A - B visibility
		 * @return {Boolean} visible
		 */
		function isVisible(point1, point2) {
			var visible,
				midpoint;

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

			if (visible) {
				// so far its visible, but now, we need to check if a point between point1 and point2 is inside a triangle
				// if so, its visible, if not, then we traced a point that went through outside level boundaries
				// to continue visibility
				// the point must be inside at least 1 triangle
				visible = !!getTriangleFromPosition(point1.lerp(point2, 0.5));
			}

			return visible;
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

							point1.midpoint[j] = midpoint;

							if (i != j) {
								distance = getDistance(point1, point2);
								visible = isVisible(point1, point2);
							}

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
				var triangle_point = getClosestPointOfTriangle(point, triangle),
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
		// http://www.growingwiththeweb.com/2012/06/a-pathfinding-algorithm.html
		this.findPath = function(start_node, end_node) {
			var start_point = start_node,
				end_point = end_node,
				g = 0,
				h = end_point.distance[start_point.index],
				result = {
					closed: {},
					open: {}
				};

			// add start node to open list
			result.open[start_point.index] = {
				point: start_point,
				parent: null,
				distances: {
					g: g,
					h: h,
					f: g + h
				}
			};

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

			function reconstructPath(node) {
				var path = [node];

				while (node.parent) {
					node = node.parent;
					path.push(node);
				}

				return path;
			}

			var _i = 0,
				current = null;

			while (_i++ <= 100) {

				current = getBestNode();
				if (!current) break;

				// check if current node is the goal
				if (current.point === end_point) {
					//console.log('goal found', current);
					//console.log('total iteractions', _i2 + _i);
					return reconstructPath(current).reverse();
				}

				//console.group();
				//console.log('best node', current);

				// remove current from open list
				delete result.open[current.point.index];

				// add current to closed list
				result.closed[current.point.index] = current;

				// process adjacent nodes
				// you can pass `getVisiblesOf(current.point)` for the first each param
				// or just `current.point.adjacent`
				// note: dont use getVisiblesOf because:
				// 	1. it will loop many times more than adjacents
				// 	2. we need to get nodes as much as better, this way we can create smoother paths, but then we should apply optimizePath
				$.each(current.point.adjacent, function(i, adjacent) {
					//console.log('adjacent node:', adjacent);
					var in_closed_list = result.closed[adjacent.index],
						in_open_list = result.open[adjacent.index],
						g,
						h;

					if (in_closed_list) return;

					g = adjacent.distance[current.point.index] + current.distances.g;
					if (in_open_list) {
						//console.log('adjacent already on open list');
						if (g < in_open_list.distances.g) {
							in_open_list.distances.g = g;
							in_open_list.parent = current;
						}

					} else {
						h = adjacent.distance[end_point.index];
						// add adjacent to open list
						result.open[adjacent.index] = {
							point: adjacent,
							parent: current,
							distances: {
								g: g,
								h: h,
								f: g + h
							}
						};
					}

				});

				//console.groupEnd();
			}

			return;

		}

		/**
		 * remove unnecessary points from the path
		 * we cant simply remove nodes between visible ones
		 * we should do another path find, using the passed points only
		 * 
		 * I am adding the destination point to the path
		 * so optimizePath will recognize it as a level node
		 */
		function optimizePath(path, start_point, end_point) {
			// add agent start and end points
			$.extend(start_point, {
				index: 'start',
				visibility: ObserverCore.utils.object([path[0].point.index], true)
			});
			path.unshift({
				point: start_point
			});

			$.extend(end_point, {
				index: 'end',
				visibility: ObserverCore.utils.object([path[path.length - 1].point.index], true)
			});
			path.push({
				point: end_point
			});

			// start path optimization
			var path_len = path.length,
				start_point = path[path_len - 1].point,
				end_point = path[0].point,
				g = 0,
				h = getDistance(end_point, start_point),
				result = {
					closed: {},
					open: {}
				},
				_i = 0,
				current = null;

			// add start node to open list
			result.open[start_point.index] = {
				point: start_point,
				parent: null,
				distances: {
					g: g,
					h: h,
					f: g + h
				}
			};

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

			function reconstructPath(node) {
				var path = [node];

				while (node.parent) {
					node = node.parent;
					path.push(node);
				}

				return path;
			}

			function getVisiblesOf(point) {
				return $.grep(path, function(node) {
					var visible = (point.visibility && point.visibility[node.point.index]) || (node.point.visibility && node.point.visibility[point.index]);
					if (visible !== undefined) {
						return visible;
					} else {
						return isVisible(point, node.point);
					}
				});
			}

			while (_i++ <= 100) {

				current = getBestNode();
				if (!current) break;

				// check if current node is the last
				if (current.point === end_point) {
					//console.log('goal found', current);
					return reconstructPath(current);
				}

				//console.group();
				//console.log('best node', current);

				// remove current from open list
				delete result.open[current.point.index];

				// add current to closed list
				result.closed[current.point.index] = current;

				// process VISIBLE nodes - not adjacent (it was used in the findPath method)
				$.each(getVisiblesOf(current.point), function(i, visible) {
					visible = visible.point;
					var in_closed_list = result.closed[visible.index],
						in_open_list = result.open[visible.index],
						g,
						h;

					if (in_closed_list) return;

					g = ((visible.distance && visible.distance[current.point.index]) || getDistance(visible, current.point)) + current.distances.g;
					if (in_open_list) {
						//console.log('visible already on open list');
						if (g < in_open_list.distances.g) {
							in_open_list.distances.g = g;
							in_open_list.parent = current;
						}

					} else {
						h = (visible.distance && visible.distance[end_point.index]) || getDistance(visible, end_point);
						// add visible to open list
						result.open[visible.index] = {
							point: visible,
							parent: current,
							distances: {
								g: g,
								h: h,
								f: g + h
							}
						};
					}

				});

				//console.groupEnd();
			}
console.log('FODEOOOOOOOO', _i);
			return path;
		}

		/**
		 * return the closest point from any position
		 */
		function getClosestPointFromPosition(pos) {
			var result = null,
				point = new Poly2tri.Point(pos.x, pos.y),
				triangles = self.poly2tri.getTriangles(),
				closest_dist = Infinity;

			$.each(triangles, function(i, triangle) {
				var triangle_point = getClosestPointOfTriangle(point, triangle),
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