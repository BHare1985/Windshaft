// Note, currently to run this server your table must have a column called the_geom_webmercator with SRID of 3857
// to view the tiles, open ./viewer/index.html and set the fields
//
// If you want to get something running quickly, follow the instructions for a seed DB in test/windshaft.test.sql


var Windshaft = require('../lib');
var _         = require('underscore');
var config = {
	dbtype: 'mssql',
	geom_type: 'polygon',
    tileRoute: '/:dbname/tiles/:table/:z/:x/:y.*',
    grainstore: {
		map: {srid: 3857},
		datasource: {
			host: "ALIENWARE",
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
    enableCors: true,
    parameterParser: function(req, callback){

        req.params.interactivity = 'name';

        _.extend(req.params, req.query);

        // send the finished req object on
        callback(null,req);
    }
};

// Initialize tile server on port 4000
var ws = new Windshaft.Server(config);
ws.listen(4000);

console.log("map tiles are now being served out of: http://localhost:4000" + config.tileRoute);
