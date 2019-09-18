var express = require("express");
var grainstore = require("grainstore");
var RenderCache = require("./renderCache");
var _ = require("underscore");
var lodash = require("lodash");
var step = require("step");

module.exports = function(opts) {
	opts = opts || {};
	var renderCaches = [];
	var options = [];

	lodash.defaultsDeep(opts,
		{
			datasource: "database",
			geom_type: "polygon",
			enableCors: false,
			jsonp: true,
			gridFileExtensions: ["grid.json", "json", "js", "jsonp"],
			logErrors: true,
			logErrorTrace: true,
			showErrors: true,
			grainstore: {
				mapnik_version: "3.0.12",
				default_style_version: "3.0.12",
				map: { srid: 3857 }
			}
		});

	if (opts.datasource === "database" && !_.isString(opts.dbtype)) {
		throw new Error("Must initialise Windwalker with a database type when datasource is 'database'");
	}

	if (opts.dbtype === "postgres") {
		opts.dbtype = "postgis";
	}

	// initialize express server
	var app = express();

	// extend app with all opts properties and methods
	_.extend(app, opts);

	// set default beforeTileRender and afterTileRender filters
	_.defaults(app,
		{
			index: function(req, res) {
				res.send("Windwalker");
			},
			parameterParser: function(req, callback) {
				callback(null);
			},
			beforeTileRender: function(req, res, callback) {
				callback(null);
			},
			afterTileRender: function(req, res, tile, headers, callback) {
				callback(null, tile, headers);
			}
		});

	app.get("/",
		function(req, res) {
			app.index(req, res);
		});

	app.setupMap = function(mapKey, mapOpts) {
		options[mapKey] = lodash.merge({}, opts, mapOpts);
		var mmlStore = new grainstore.MMLStore(options[mapKey].grainstore);
		renderCaches[mapKey] = new RenderCache(1000 * 60 * 15, mmlStore);
	};

	if (opts.tileRoute) {
		app.setupMap("default");
		app.get(opts.tileRoute,
			function(req, res) {
				app.processTileRoute("default", req, res);
			});
	}

	app.processTileRoute = function(mapKey, req, res, inParameterParser, inBeforeTileRender, inAfterTileRender) {
		if (req.params.datasource === "database" && !_.isString(req.params.dbname)) {
			throw new Error("Request must contain dbname parameter when datasource is 'database'");
		}

		req.params.mapKey = mapKey;

		app.parameterParser = inParameterParser || app.parameterParser;
		app.beforeTileRender = inBeforeTileRender || app.beforeTileRender;
		app.afterTileRender = inAfterTileRender || app.afterTileRender;

		// Enable CORS access by web browsers if set in settings
		if (options[mapKey].enableCors) {
			res.header("Access-Control-Allow-Origin", "*");
			res.header("Access-Control-Allow-Headers", "X-Requested-With");
		}

		res.header("X-Powered-By", "Windwalker Tile Server");

		var fileExtension = req.params["0"].toLowerCase();
		var gridRequest = (options[mapKey].gridFileExtensions.indexOf(fileExtension) !== -1);

		step(
			function parseParameters() {
				app.parameterParser(req, this);
			},
			function preTileRender(err) {
				if (err) throw err;

				if (req.params.datasource === "database" && !req.params.sql)
					throw new Error("SQL is required after parameter parsing when datasource is 'database'");

				if (!req.params.style) delete req.params.style;

				_.defaults(req.params, app.getDefaults(req.params));

				app.beforeTileRender(req, res, this);
			},
			function getTileRenderer(err, tile, headers) {
				if (err) throw err;
				if (tile) return this(null, tile, headers);

				app.layerDefinitionsToGrainstoreArrays(req.params);

				renderCaches[mapKey].getRenderer(req, this);
			},
			function renderTile(err, renderer, headers) {
				if (err) throw err;
				if (!renderer["getTile"]) return this(null, renderer, headers);
				var renderFunction = (gridRequest) ? "getGrid" : "getTile";
				renderer[renderFunction].call(renderer, req.params.z, req.params.x, req.params.y, this);
			},
			function postTileRender(err, tile, headers) {
				if (err) throw err;
				app.afterTileRender(req, res, tile, headers, this);
			},
			function handleErrors(err, tile, headers) {
				res.header(headers);

				if (err) {
					if (options[mapKey].logErrors || options[mapKey].logErrorTrace) {
						global.console.log("[TILE RENDER ERROR]\n" + err.message);
						if (options[mapKey].logErrorTrace) {
							global.console.trace(err);
						}
					}

					res.setHeader("Cache-Control", "no-cache, must-revalidate, proxy-revalidate");
					var errMsg = options[mapKey].showErrors ? err.message : "Internal error occured";
					return res.status(500).send(errMsg);
				}

				if (res.statusCode === 304 || res.statusCode === 204) {
					return res.send();
				}

				if (gridRequest && options[mapKey].jsonp && Buffer.isBuffer(tile) === false) {
					return res.jsonp(tile);
				}

				return res.send(tile);
			}
		);
	};

	app.createLayerDefinitions = function(params) {
		var defaultLayer = {
			id: params.id,
			sql: params.sql,
			style: params.style,
			interactivity: params.interactivity
		};

		var layers = Array.isArray(params.layers) ? params.layers : [defaultLayer];

		layers.forEach(function(layer, i) {
			layer.id = layer.id || "layer" + i;
			layer.sql = layer.sql;
			layer.style = layer.style || params.style;
			layer.interactivity = layer.interactivity || null;
		});

		return layers;
	};

	app.layerDefinitionsToGrainstoreArrays = function(params) {
		var layers = app.createLayerDefinitions(params);

		params.ids = [];
		params.sql = [];
		params.style = [];
		params.interactivity = [];

		layers.forEach(function(layer, i) {
			params.ids.push(layer.id);
			params.sql.push(app.wrapSql(layer.sql, layer.id));
			params.style.push(layer.style);
			params.interactivity.push(layer.interactivity);
			if (typeof params.layer === "undefined" && layer.interactivity
			) { // The first valid interactivity is the layer
				params.layer = i;
			}
		});
	};

	app.wrapSql = function(sql, layerId) {
		var preWrapped = /\(.*?\)\s+(as )?\w+$/.test(sql);
		if (!preWrapped) {
			sql = "(" + sql + ") as " + layerId + "_subquery";
		}

		return sql;
	};

	app.getDefaults = function(params) {
		params = params || {};

		if (!params.id) params.id = "defaultLayer";

		var defStylePoint =
			"{marker-fill: #FF6600;marker-opacity: 1;marker-width: 16;marker-line-color: white;marker-line-width: 3;marker-line-opacity: 0.9;marker-placement: point;marker-type: ellipse;marker-allow-overlap: true;}";
		var defStyleLine = "{line-color:#FF6600; line-width:1; line-opacity: 0.7;}";
		var defStylePoly = "{polygon-fill:#FF6600; polygon-opacity: 0.7; line-opacity:1; line-color: #FFFFFF;}";

		var defaultStyle = _.template(
			'#<%= id %>["mapnik::geometry_type"=1] ' +
			defStylePoint +
			'#<%= id %>["mapnik::geometry_type"=2] ' +
			defStyleLine +
			'#<%= id %>["mapnik::geometry_type"=3] ' +
			defStylePoly);

		return {
			datasource: options[params.mapKey].datasource,
			dbtype: options[params.mapKey].dbtype,
			id: params.id,
			style: defaultStyle(params),
			format: params["0"].toLowerCase(),
			geom_type: "polygon",
			interactivity: null
		};
	};

	return app;
};