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

	_.defaults(opts, {
        geom_type: 'polygon',
        enableCors: false,
		jsonp: true,
		gridFileExtensions: ['grid.json', 'json', 'js', 'jsonp'],
		logErrors: true,
		logErrorTrace: true,
		showErrors: true,
		grainstore: {
			mapnik_version: '2.3.0',
			default_style_version: '2.3.0',
			map: {srid: 3857}
		}
	});
	
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
        req.params.mapKey = mapKey;
        
		app.parameterParser = inParameterParser || app.parameterParser;
		app.beforeTileRender = inBeforeTileRender || app.beforeTileRender;
		app.afterTileRender = inAfterTileRender || app.afterTileRender;

		// Enable CORS access by web browsers if set in settings
		if(options[mapKey].enableCors){
			res.header("Access-Control-Allow-Origin", "*");
			res.header("Access-Control-Allow-Headers", "X-Requested-With");
		}
		
		res.header('X-Powered-By', 'Windwalker Tile Server');

        var fileExtension = req.params['0'].toLowerCase();
        var gridRequest = (options[mapKey].gridFileExtensions.indexOf(fileExtension) !== -1);

		Step(
			function parseParameters(){
				app.parameterParser(req, this);
			},
			function preTileRender(err) {
				if (err) throw err;
				
				if(!req.params.sql) throw new Error("SQL is required after parameter parsing");		
				if(!req.params.style) delete req.params.style

                _.defaults(req.params, app.getDefaults(req.params));

				app.beforeTileRender(req, res, this);
			},
			function getTileRenderer(err, tile, headers){
				if (err) throw err;
				if (tile) return this(null, tile, headers);
				
				app.layerDefinitionsToGrainstoreArrays(req.params);
				
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
                res.header(headers);
                
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
				
                if(res.statusCode == 304 || res.statusCode == 204) {
                    return res.send();
				}
				
                if(gridRequest && options[mapKey].jsonp && Buffer.isBuffer(tile) === false) {
                    return res.jsonp(tile);
                }
				
                return res.send(tile);
			}
		);
	}
				

	app.createLayerDefinitions = function(params) {
        var defaultLayer = {
            id: params.id,
            sql: params.sql, 
            style: params.style, 
            interactivity: params.interactivity
        };
        
        var layers = Array.isArray(params.layers) ? params.layers : [defaultLayer];
        
		layers.forEach(function(layer, i){
            layer.id = layer.id || "layer" + i;
            layer.sql = layer.sql;
            layer.style = layer.style || params.style;
            layer.interactivity = layer.interactivity || null;
		});
		
		return layers;
	}

    app.layerDefinitionsToGrainstoreArrays = function (params){
    	var layers = app.createLayerDefinitions(params);

        params.ids = [];
        params.sql = [];
        params.style = [];
        params.interactivity = [];
        
        layers.forEach(function(layer, i){
            params.ids.push(layer.id);
            params.sql.push(app.wrapSql(layer.sql, layer.id));
            params.style.push(layer.style);
            params.interactivity.push(layer.interactivity);
            if(typeof params.layer === 'undefined' && layer.interactivity) { // The first valid interactivity is the layer
                params.layer = i;
            }
        });
    }
	
	app.wrapSql = function(sql, layerId) {
		var preWrapped = /\(.*?\)\s+(as )?\w+$/.test(sql)
		if(!preWrapped) {
			sql = "("+sql+") as " + layerId + "_subquery";
		}
		
		return sql;
	}

	app.getDefaults = function(params) {
		var params = params || {};
		
		if(!params.id) params.id = "defaultLayer";
		
		var def_style_point = "{marker-fill: #FF6600;marker-opacity: 1;marker-width: 16;marker-line-color: white;marker-line-width: 3;marker-line-opacity: 0.9;marker-placement: point;marker-type: ellipse;marker-allow-overlap: true;}";		
		var def_style_line = "{line-color:#FF6600; line-width:1; line-opacity: 0.7;}";		
		var def_style_poly = "{polygon-fill:#FF6600; polygon-opacity: 0.7; line-opacity:1; line-color: #FFFFFF;}";		
		
		var default_style = _.template(	
			'#<%= id %>[mapnik-geometry-type=1] ' + def_style_point +		
			'#<%= id %>[mapnik-geometry-type=2] ' + def_style_line +		
			'#<%= id %>[mapnik-geometry-type=3] ' + def_style_poly);
		
		return {
			dbtype: options[params.mapKey].dbtype,
			id: params.id,
			style: default_style(params),
			format: 'png',
			geom_type: 'polygon',
			interactivity: null
		}
	}

	return app;
};