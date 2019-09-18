var _ = require("underscore");

module.exports = function(type) {
	if (type === "database") {
		return {
			datasource: "database",
			dbtype: global.environment.dbtype,
			tileRoute: "/database/:dbname/table/:table/:z/:x/:y.*",
			grainstore: { datasource: global.environment.datasource },
			parameterParser: function(req, callback) {
				req.params.interactivity = null;

				req.params.sql = "SELECT * FROM " + req.params.table;

				req.params = _.extend({}, req.params);
				_.extend(req.params, req.query);

				callback(null, req);
			}
		};
	} else {
		return {
			datasource: type,
			tileRoute: "/" + type + "/:pathname/:z/:x/:y.*",
			parameterParser: function(req, callback) {
				req.params.interactivity = null;

				req.params.pathname = "./test/fixtures/" + req.params.pathname;

				req.params = _.extend({}, req.params);
				_.extend(req.params, req.query);

				callback(null, req);
			}
		};
	}
};