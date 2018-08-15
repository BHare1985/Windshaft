// Note, currently to run this server your table must have a column called the_geom_webmercator with SRID of 3857
// to view the tiles, open ./viewer/index.html and set the fields
//
// If you want to get something running quickly, follow the instructions for a seed DB in test/windshaft.test.sql


var Windshaft = require('../lib');
var _         = require('underscore');

var config = {
	dbtype: 'mssql',
	geom_type: 'polygon',
    grainstore: {
		map: {srid: 3857},
		datasource: {
			host: "localhost",
			user: "sa",
			password: "sa",
			geometry_field: "the_geom",
			extent: "-180,-90,180,90",
			srid: 4326,
			max_size: 10
		},
		styles: {
			 polygon: "::line {line-color: red; line-width: 4; line-join: round; line-cap: round;}",  
		},
    },
    showErrors: true,
    logErrors: true,
    logErrorTrace: true,
    enableCors: true
};

// Initialize with configuration and get back express4 server object
var app = new Windshaft.Server(config);

//Enable compression for grid tiles (requires module)
//app.use(compression()) // Will not compress png by default, see module

// Use morgan logger with "dev" log type (requires module)
//app.use(morgan("dev"));


// Setup fakemaps
app.setupMap('fakemap');
app.setupMap('fakemap2', { dbtype: 'postgres' }); // Use postgres instead of mssql

//Setup custom tile route for fakemap,
app.get('/fakemaps/:z/:x/:y.*', function (req, res) {
    app.processTileRoute('fakemap', req, res);
    app.processTileRoute('fakemap2', req, res, app.parameterParser);
});


//Setup a map with key "map1" with overriding configuration
// This is the map we will use in the viewer
app.setupMap('map1', { 
    grainstore: { 
        properties: { 
            'cache-features':  'on'
        }
    }
});

//Setup custom tile route, alternatively use config.tileRoute
app.get('/:dbname/tiles/:table/:z/:x/:y.*', function (req, res) {
    app.processTileRoute('map1', req, res, app.parameterParser, app.beforeTileRender, app.afterTileRender);
});



app.parameterParser = function(req, callback){
    // This is where pre-processing comes in place. I set the interactivity
    // field to be name so it popups on the map
    req.params.interactivity = 'name';


    // Convert every query variable to a request parameter (sql, style, table, etc)
    _.extend(req.params, req.query);


    if(!req.query.sql) {
        req.params.layers = [
            {
                id: "carto1",
                sql: "SELECT * FROM test_table WHERE [cartodb_id] = 1",
                interactivity: "name,cartodb_id"
            },{
                id: "carto2",
                sql: "SELECT * FROM test_table WHERE [cartodb_id] = 2",
                interactivity: "address,cartodb_id"
            }
        ];

    }
    
    
    // send the finished req object on
    callback(null,req);
};


app.beforeTileRender = function(req, res, callback) {
    // Great place to check if tile has been modified and rather or not to send
    // a 304 and skip a database call. Just set tile to non-null or the tile body
    // and getting the tile will be skipped
    
    //Setup fake header to showcase beforeTileRender() function
    res.setHeader('x-beforeTileRender', new Date());

    var tile = null;
    var headers = null;
    callback(null, tile, headers);
};


app.afterTileRender = function(req, res, tile, headers, callback) {
    // Great place to save processed tiles to a cache and to be checked in beforeTileRender
    // You have access to the tile and current headers for logic/processing

    //Setup fake header to showcase beforeTileRender() function
    headers['x-afterTileRender'] = new Date();
    return callback(null, tile, headers);
};


// Have the server listen on port 4000
var listener = app.listen(4000, function(){
    console.log("map tiles are now being served out of: http://localhost:" + listener.address().port + config.tileRoute);
});