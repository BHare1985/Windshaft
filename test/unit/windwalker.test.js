require('../support/test_helper.js');

var _ = require("underscore");
var assert = require("assert");
var Windwalker = require("../../lib");
var serverOptions = require("../support/server_options")("database");

suite("windwalker",
	function() {
		test("true",
			function() {
				assert.equal(global.environment.name, "test");
			});

		test("can instantiate a Windwalker object (configured express instance)",
			function() {
				var ws = new Windwalker.Server(serverOptions);
				assert.ok(ws);
			});

		test("can spawn a new server on the global listen port",
			function() {
				var ws = new Windwalker.Server(serverOptions);
				var listener = ws.listen(global.environment.windwalkerPort);
				assert.ok(ws);
				listener.close();
			});

		test("datasource is database if not specified",
			function() {
				var ws = new Windwalker.Server({ dbtype: "banana" });
				assert.equal(ws.datasource, "database");
			});

		test("throws exception if incorrect options passed in for database",
			function() {
				assert.throws(
					function() {
						var ws = new Windwalker.Server({ datasource: "database" });
					},
					/Must initialise Windwalker with a database type/
				);
			});

		test("dbtype not required if datasource is not database",
			function() {
				var ws = new Windwalker.Server({ datasource: "shape" });
			});

		test("options are set on main windwalker object",
			function() {
				var ws = new Windwalker.Server(serverOptions);
				assert.ok(_.isFunction(ws.parameterParser));
				assert.equal(ws.tileRoute, "/database/:dbname/table/:table/:z/:x/:y.*");
			});

		test("default options are set",
			function() {
				var ws = new Windwalker.Server(serverOptions);
				assert.equal(ws.jsonp, true);
				assert.deepEqual(ws.gridFileExtensions, ["grid.json", "json", "js", "jsonp"]);
			});

		test("jsonp gets set",
			function() {
				var ws = new Windwalker.Server(_.extend(serverOptions, { jsonp: false }));
				assert.equal(ws.jsonp, false);
			});

		test("gridFileExtensions gets set",
			function() {
				var value = ["json"];
				var ws = new Windwalker.Server(_.extend(serverOptions, { gridFileExtensions: value }));
				assert.deepEqual(ws.gridFileExtensions, value);
			});


	});