var fs = require("fs");
var path = require("path");
var express  = require('express');
var grainstore = require('grainstore');
var RenderCache = require('./render_cache');
var _ = require('underscore');
var lodash = require('lodash');
var Step = require('step');

module.exports = function(opts){
	var opts = opts || {};

	if (!_.isString(opts.dbtype)) {
		throw new Error("Must initialise Windwalker with a database type");
	}
	
	if(opts.dbtype == 'postgres') {
		opts.dbtype = 'postgis';
	}
	
	var renderCaches = [];
	var options = [];
	
	
	// initialize express server
	var app = express();

	// extend app with all opts propeties and methods
	_.extend(app, opts);

	// set detault beforeTileRender and afterTileRender filters
	_.defaults(app, {
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
	
	app.get('/', function(req, res){
		app.index(req, res);
	});

	app.setupMap = function(mapKey, mapOpts) {
		options[mapKey] = lodash.merge({}, opts, mapOpts);
		var mml_store  = new grainstore.MMLStore(options[mapKey].grainstore);
		renderCaches[mapKey] = new RenderCache(1000 * 60 * 15, mml_store);
	}
	
	if(opts.tileRoute) {
		app.setupMap('default');
		app.get(opts.tileRoute, function(req, res){
			app.processTileRoute('default', req, res);
		});
	}
	
	app.processTileRoute = function(mapKey, req, res, inParameterParser, inBeforeTileRender, inAfterTileRender) {
		if(!_.isString(req.params.dbname)) throw new Error("Request must define :dbname in tileRoute");

		app.parameterParser = inParameterParser || app.parameterParser;
		app.beforeTileRender = inBeforeTileRender || app.beforeTileRender;
		app.afterTileRender = inAfterTileRender || app.afterTileRender;

		// Enable CORS access by web browsers if set in settings
		if(options[mapKey].enableCors){
			res.header("Access-Control-Allow-Origin", "*");
			res.header("Access-Control-Allow-Headers", "X-Requested-With");
		}
		
		res.header('X-Powered-By', 'Windwalker Tile Server');

        var gridRequest = (req.params['0'] === 'grid.json');

		// Wrap SQL requests in mapnik format if sent
		if(req.query.sql) {
			req.query.sql = "("+req.query.sql+") as windwalker_query_sql";
		}
		
		Step(
			function parseParameters(){
				app.parameterParser(req, this);
			},
			function preTileRender(err) {
				if (err) throw err;
				
				if(!req.params.style) delete req.params.style
				if(!req.params.sql) delete req.params.sql				
				_.defaults(req.params, app.getDefaults(mapKey, req.params));
				
				app.beforeTileRender(req, res, this);
			},
			function getTileRenderer(err, tile, headers){
				if (err) throw err;
				if (tile) return this(null, tile, headers);
				renderCaches[mapKey].getRenderer(req, this);
			},
			function renderTile(err, renderer, headers) {
				if (err) throw err;
				if (!renderer['getTile']) return this(null, renderer, headers);
                var renderFunction = (gridRequest) ? 'getGrid' : 'getTile';
				renderer[renderFunction].call(renderer, req.params.z, req.params.x, req.params.y, this);
			},
			function postTileRender(err, tile, headers) {
				if (err) throw err;
				app.afterTileRender(req, res, tile, headers, this);
			},
			function handleErrors(err, tile, headers) {
				if (err){
					res.setHeader('Cache-Control', 'no-cache, must-revalidate, proxy-revalidate');
					if(options[mapKey].showErrors) {
						res.status(500).send(err.message);
					} else {
						res.status(500).send("Internal error occured");
					}
					
					if(options[mapKey].logErrors || options[mapKey].logErrorTrace) {
						console.log("[TILE RENDER ERROR]\n" + err.message);
						if(options[mapKey].logErrorTrace) {
							console.trace(err)
						}
					}
					return;
				}
				
                res.header(headers);
                if(headers['Content-Type'] === 'application/json') {
                    return res.jsonp(tile);
                }
                return res.send(tile);
			}
		);
	}

	app.getDefaults = function(mapKey, params) {
		var params = params || {};
		
		if(!params.table) params.table = "layer0";
		
		var def_style_point = "{marker-fill: #FF6600;marker-opacity: 1;marker-width: 16;marker-line-color: white;marker-line-width: 3;marker-line-opacity: 0.9;marker-placement: point;marker-type: ellipse;marker-allow-overlap: true;}";		
		var def_style_line = "{line-color:#FF6600; line-width:1; line-opacity: 0.7;}";		
		var def_style_poly = "{polygon-fill:#FF6600; polygon-opacity: 0.7; line-opacity:1; line-color: #FFFFFF;}";		
		
		var default_style = _.template(	
			'#<%= table %>[mapnik-geometry-type=1] ' + def_style_point +		
			'#<%= table %>[mapnik-geometry-type=2] ' + def_style_line +		
			'#<%= table %>[mapnik-geometry-type=3] ' + def_style_poly);

		var default_sql = _.template("<%= table %>");
		
		return {
			dbtype: options[mapKey].dbtype,
			table: params.table,
			style: default_style(params),
			sql: default_sql(params),
			format: 'png',
			geom_type: 'polygon',
			interactivity: null
		}
	}

	return app;
};