#target photoshop
var global = {};
#include "utils/jquery.js"
#include "utils/json2.js"
#include "../../Poly2Tri/poly2tri.js"

/**
 * photoshop layer structure:
 * generateNavMesh:
 * 		- shape layer: `[name].navmesh`
 */

;
(function($) {

	function getLayer(layers, layer_name) {
		for (var layer_set_index = 0, layer_set_len = layers.length; layer_set_index < layer_set_len; layer_set_index++) {
			var layer_set = layers[layer_set_index];

			if (layer_set.name != layer_name) continue;

			return layer_set;
		}

	}

	function DrawShape() {
	    var doc = app.activeDocument;
	    var y = arguments.length;
	    var i = 0;

	    var lineArray = [];
	    for (i = 0; i < y; i++) {
	        lineArray[i] = new PathPointInfo;
	        lineArray[i].kind = PointKind.CORNERPOINT;
	        lineArray[i].anchor = arguments[i];
	        lineArray[i].leftDirection = lineArray[i].anchor;
	        lineArray[i].rightDirection = lineArray[i].anchor;
	    }

	    var lineSubPathArray = new SubPathInfo();
	    lineSubPathArray.closed = true;
	    lineSubPathArray.operation = ShapeOperation.SHAPEADD;
	    lineSubPathArray.entireSubPath = lineArray;
	    var myPathItem = doc.pathItems.add("myPath", [lineSubPathArray]);


	    var desc88 = new ActionDescriptor();
	    var ref60 = new ActionReference();
	    ref60.putClass(stringIDToTypeID("contentLayer"));
	    desc88.putReference(charIDToTypeID("null"), ref60);
	    var desc89 = new ActionDescriptor();
	    var desc90 = new ActionDescriptor();
	    var desc91 = new ActionDescriptor();
	    desc91.putDouble(charIDToTypeID("Rd  "), 0.000000); // R
	    desc91.putDouble(charIDToTypeID("Grn "), 255); // G
	    desc91.putDouble(charIDToTypeID("Bl  "), 255); // B
	    var id481 = charIDToTypeID("RGBC");
	    desc90.putObject(charIDToTypeID("Clr "), id481, desc91);
	    desc89.putObject(charIDToTypeID("Type"), stringIDToTypeID("solidColorLayer"), desc90);
	    desc88.putObject(charIDToTypeID("Usng"), stringIDToTypeID("contentLayer"), desc89);
	    executeAction(charIDToTypeID("Mk  "), desc88, DialogModes.NO);

	    myPathItem.remove();
	}

	function saveFile(layerName, str) {
		var fileName = app.activeDocument.name.substring(0, app.activeDocument.name.lastIndexOf("."));
		var path = app.activeDocument.path.fsName;
		var fullPath = path + "/" + fileName + "_" + layerName + ".json";
		var file = new File(fullPath);
		file.open('w');
		file.write(str);
		file.close();
		alert("Saved to " + fullPath);
	}

	function generatePolygons() {
		var doc = app.activeDocument,
			result = [];

		// cada pathItem tem subPathItem
		// em outras palavras é um layer com varias camadas de shapes
		// cada uma pode ser movida pra cima/baixo/front, etc...
		// e cada layer pode ser atribuido uma propriedade de "renderizacao":
		// combine, subtract, intersect, exclude
		// mas há uma aba no photoshop que mostra o path final que esta layer vai renderizar, aba `Paths`
		$.each(doc.pathItems, function(ipath, path) {
			$.each(path.subPathItems, function(ispi, spi) {
				var hole = [],
					points = [];

				// subshapes devem estar como "exclude overlapping shapes"
				$.each(spi.pathPoints, function(ipp, pp) {
					var x = Math.ceil(pp.anchor[0]),
						y = Math.ceil(pp.anchor[1]);

					points.push([x,y]);
				});

				result.push(points);
			});
		});

		return result;
	}

	function generatePath(polygons) {
		var poly2tri = global.poly2tri,
			swctx = new poly2tri.SweepContext([]);

		$.each(polygons, function(i, polygon_coords) {
			var hole = [];

			$.each(polygon_coords, function(j, coord) {
				var x = Math.ceil(coord[0]),
					y = Math.ceil(coord[1]);

				hole.push(new poly2tri.Point(x,y));
			});

			swctx.addHole(hole);
		});

		return swctx;
	}

	function generateTriangles(path) {
		var triangles = path.triangulate().getTriangles(),
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

	/*function getBoundaries(path) {
		var result = [],
			triangles = path.triangulate().getTriangles();

		$.each(triangles, function(i, triangle) {
			var points = triangle.getPoints();

			$.each(points, function(pi, point) {
				var p1 = pi,
					p2 = (pi + 1) % 3,
					edge_index = triangle.edgeIndex(points[p1], points[p2]),
					constrained = triangle.constrained_edge[edge_index];

				if (!constrained) return;

				result.push([points[p1].x, points[p1].y]);
				result.push([points[p2].x, points[p2].y]);
			});
		});

		return result;
	}*/

	function createTriangulationLayers(triangles) {
		$.each(triangles, function(i, triangle) {
			DrawShape.apply(DrawShape, triangle);
		});
	}


	var polygons = generatePolygons(),
		path = generatePath(polygons),
		triangles = generateTriangles(path);

	// create layer with triangulation
	if (confirm('Do you want to generate triangulation layers in your PSD file?')) {
		createTriangulationLayers(triangles);
	}

	saveFile('navMesh', JSON.stringify({
		polygons: polygons
	}));

})(jQuery);