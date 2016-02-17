var fs = require("fs");
var path = require("path");
var express  = require('express');
var grainstore = require('grainstore');
var RenderCache = require('./render_cache');
var _ = require('underscore');
var lodash = require('lodash');
var Step = require('step');
var compression = require('compression');

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
    var app = express.createServer();
    app.use(compression())
    app.enable('jsonp callback');
    app.use(express.bodyParser());
    
    if(opts.logRequests) {
        var log_format = opts.log_format || '[:req[X-Real-IP] > :req[Host] @ :date] \033[90m:method\033[0m \033[36m:url\033[0m \033[90m:status :response-time ms -> :res[Content-Type]\033[0m'

        app.use(express.logger({
            buffer: !opts.unbuffered_logging,
            format: log_format
        }));
    }
    
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
    
    if(opts.tileRoute) {
        app.get(opts.tileRoute, function(req, res){
            app.processTileRoute(req, res);
        });
    }
    
    app.setupMap = function(key, mapOpts) {
		options[key] = lodash.merge(opts, mapOpts);
		var mml_store  = new grainstore.MMLStore(options[key].grainstore);
		renderCaches[key] = new RenderCache(1000 * 60 * 15, mml_store);
    }
    
    
    app.processTileRoute = function(key, req, res, inParameterParser, inBeforeTileRender, inAfterTileRender) {
        if(!_.isString(req.params.dbname)) throw new Error("Request must define :dbname in tileRoute");

		app.parameterParser = inParameterParser || app.parameterParser;
		app.beforeTileRender = inBeforeTileRender || app.beforeTileRender;
		app.afterTileRender = inAfterTileRender || app.afterTileRender;

        // Enable CORS access by web browsers if set in settings
        if(options[key].enableCors){
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "X-Requested-With");
        }
        
        res.header('X-Powered-By', 'Windwalker Tile Server');

        // strip format from end of url and attach to params
        req.params.format = req.params['0'];
        delete req.params['0'];

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
				_.defaults(req.params, app.getDefaults(req.params));
                
                app.beforeTileRender(req, res, this);
            },
            function getTileRenderer(err, tile, headers){
                if (err) throw err;
                if (tile) return this(null, tile, headers);
                renderCaches[key].getRenderer(req, this);
            },
            function renderTile(err, renderer, headers) {
                if (err) throw err;
                if (!renderer['getTile']) return this(null, renderer, headers);
                var func = (req.params.format === 'grid.json') ? 'getGrid' : 'getTile';
                renderer[func].call(renderer, req.params.z, req.params.x, req.params.y, this);
            },
            function postTileRender(err, tile, headers) {
                if (err) throw err;
                app.afterTileRender(req, res, tile, headers, this);
            },
            function handleErrors(err, tile, headers) {
                if (err){
                    res.setHeader('Cache-Control', 'no-cache, must-revalidate, proxy-revalidate');
                    if(options[key].showErrors) {
                        res.send(err.message, 500);
                    } else {
                        res.send("Internal error occured", 500);
                    }
                    
                    if(options[key].logErrors || options[key].logErrorTrace) {
                       console.log("[TILE RENDER ERROR]\n" + err.message);
                         if(options[key].logErrorTrace) {
                            console.trace(err)
                        }
                    }  
                } else {
					res.send(tile, headers);
                }
            }
        );
    }

	app.getDefaults = function(params) {
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
			dbtype: options[key].dbtype,
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