var _ = require('underscore');

module.exports = function() {
    
    var testDefaults = {
		dbtype: global.environment.dbtype,
        tileRoute: '/database/:dbname/table/:table/:z/:x/:y.*',
        grainstore: {datasource: global.environment.datasource},
        parameterParser: function(req, callback){
            req.params.interactivity = null;
            req.params.sql = "SELECT * FROM " + req.params.table;

            req.params =  _.extend({}, req.params);
            _.extend(req.params, req.query);
            
            callback(null,req);
        }
    }

    return testDefaults;
}();
