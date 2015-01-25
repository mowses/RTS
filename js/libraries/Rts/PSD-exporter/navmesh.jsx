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

	function generateNavMesh() {
		var doc = app.activeDocument,
			result = {
				triangles: []
			},
			poly2tri = global.poly2tri,
			swctx = new poly2tri.SweepContext([]),
			triangles;

		// cada pathItem tem subPathItem
		// em outras palavras é um layer com varias camadas de shapes
		// cada uma pode ser movida pra cima/baixo/front, etc...
		// e cada layer pode ser atribuido uma propriedade de "renderizacao":
		// combine, subtract, intersect, exclude
		$.each(doc.pathItems, function(ipath, path) {
			var indexof = path.name.indexOf('.navmesh'),
				name = path.name.substr(0, indexof);

			if (indexof == -1) return;

			var res = result[name];
			$.each(path.subPathItems, function(ispi, spi) {
				var hole = [];

				// subshapes devem estar como "exclude overlapping shapes"
				$.each(spi.pathPoints, function(ipp, pp) {
					var x = Math.ceil(pp.anchor[0]),
						y = Math.ceil(pp.anchor[1]);

					hole.push(new poly2tri.Point(x,y));
				});

				swctx.addHole(hole);
			});
		});

		// triangulate
		swctx.triangulate();
		triangles = swctx.getTriangles();

		$.each(triangles, function(i, triangle) {
			var points = triangle.getPoints(),
				triangle_points = [];

			$.each(points, function(j, point) {
				triangle_points.push([point.x, point.y]);
			});

			result.triangles.push(triangle_points);
		});

		return result;
	}

	function createLayer() {
		$.each(navmeshes.triangles, function(i, triangle) {
			DrawShape.apply(DrawShape, triangle);
		});
	}


	var navmeshes = generateNavMesh();
	// create layer with triangulation
	if (confirm('Do you want to generate triangulation layers in your PSD file?')) {
		createLayer(navmeshes);
	}

	saveFile('navMesh', JSON.stringify(navmeshes));

})(jQuery);