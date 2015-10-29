var   express     = require('express')
    , grainstore  = require('grainstore')
    , RenderCache = require('./render_cache')
    , _           = require('underscore')
    , Step        = require('step');



function getDefaults(opts, params) {
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
        dbtype: opts.dbtype,
        
        table: params.table,
        style: default_style(params),
        sql: default_sql(params),
        format: 'png',
        geom_type: 'polygon',
        interactivity: null
    }
}

module.exports = function(opts){
    var opts = opts || {};

    //TODO: extract server config to a function
    // take in base url and base req2params from opts or throw exception
    if (!_.isString(opts.dbtype) || !_.isString(opts.base_url) || !_.isFunction(opts.req2params)) {
        throw new Error("Must initialise Windshaft with a database type, base URL and req2params function");
    }
    
    if(opts.dbtype == 'postgres') {
		opts.dbtype = 'postgis';
    }
    
    // initialize core mml_store
    var mml_store  = new grainstore.MMLStore(opts.grainstore);

    // initialize render cache 60 seconds TTL
    var render_cache = new RenderCache(60000, mml_store);

	// optional log format
    var log_format = opts.log_format || '[:req[X-Real-IP] > :req[Host] @ :date] \033[90m:method\033[0m \033[36m:url\033[0m \033[90m:status :response-time ms -> :res[Content-Type]\033[0m'


    // initialize express server
    var app = express.createServer();
    app.enable('jsonp callback');
    app.use(express.bodyParser());
    app.use(express.logger({
        buffer: !opts.unbuffered_logging,
        format: log_format
    }));

	// extand app with all opts propeties and methods
    _.extend(app, opts);


    // set detault beforeTileRender and afterTileRender filters
    _.defaults(app, {
        beforeTileRender: function(req, res, callback) {
            callback(null);
        },
        afterTileRender: function(req, res, tile, headers, callback) {
            callback(null, tile, headers);
        },
        afterStateChange: function(req, data, callback) {
            callback(null, data);
        }
    });

    // canary route
    app.get('/', function(req, res){
        res.send("WindShaft on Windows");
    });

    // Tile render.
    app.get(app.base_url + '/:z/:x/:y.*', function(req, res){
        
        if(!_.isString(req.params.table)) throw new Error("Request must define :table in base_url");
        if(!_.isString(req.params.dbname)) throw new Error("Request must define :dbname in base_url");
        
        // Enable CORS access by web browsers if set in settings
        if(opts.enable_cors){
            res.header("Access-Control-Allow-Origin", "*");
            res.header("Access-Control-Allow-Headers", "X-Requested-With");
        }

        req.params.format = req.params['0'];
        delete req.params['0'];
        
        if(req.query.sql) {
            req.query.sql = "("+req.query.sql+") as mapnik_query_sql";
        }
        
        Step(
            function(){
                app.req2params(req, this);
            },
            function(err) {
                if (err) throw err;
                
                if (!req.params.style) delete req.params.style
                if (!req.params.sql) delete req.params.sql
                 _.defaults(req.params, getDefaults(opts, req.params));
                 
                app.beforeTileRender(req, res, this);
            },
            function(err, data){
                if (err) throw err;
                render_cache.getRenderer(req, this);
            },
            function(err, renderer) {
                if (err) throw err;
                var my_func = (req.params.format === 'grid.json') ? 'getGrid' : 'getTile';
                renderer[my_func].call(renderer, req.params.z, req.params.x, req.params.y, this);
            },
            function(err, tile, headers) {
                if (err) throw err;
                app.afterTileRender(req, res, tile, headers, this);
            },
            function(err, tile, headers) {
                if (err){
                    console.log("[TILE RENDER ERROR]\n" + err);
                    res.send(err.message, 500);
                } else {
                    res.send(tile, headers, 200);
                }
            }
        );
    });


    return app;
};
