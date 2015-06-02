// Note, currently to run this server your table must have a column called the_geom_webmercator with SRID of 3857
// to view the tiles, open ./viewer/index.html and set the fields
//
// If you want to get something running quickly, follow the instructions for a seed DB in test/windshaft.test.sql


var Windshaft = require('../lib/windshaft');
var _         = require('underscore');
var config = {
	dbtype: 'mssql',
	geom_type: 'polygon',
    base_url: '/database/:dbname/table/:table',

    grainstore: {
		map: {srid: 3857},
		datasource: {
			host: "C-256\\sqlexpress",
			user: "sa",
			password: "708050",
			geometry_field: "Shape",
			extent: "-180,-90,180,90",
			srid: 4326,
			max_size: 10
		},
		styles: {
			 polygon: "::line {line-color: red; line-width: 4; line-join: round; line-cap: round;}",  
		},
    },
    redis: {host: '127.0.0.1', port: 6379},
    enable_cors: true,
    req2params: function(req, callback){

        // no default interactivity. to enable specify the database column you'd like to interact with
        req.params.interactivity = 'HIGHWAY_NM';

        // this is in case you want to test sql parameters eg ...png?sql=select * from my_table limit 10
        req.params =  _.extend({}, req.params);
        _.extend(req.params, req.query);

        // send the finished req object on
        callback(null,req);
    }
};

// Initialize tile server on port 4000
var ws = new Windshaft.Server(config);
ws.listen(4000);

console.log("map tiles are now being served out of: http://localhost:4000" + config.base_url + '/:z/:x/:y');
