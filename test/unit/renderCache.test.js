require("../support/test_helper.js");
var _ = require("underscore");
var path = require("path");
var assert = require("assert");
var grainstore = require("grainstore");
var RenderCache = require("../../lib/renderCache.js");
var serverOptions = require("../support/server_options")("database");

function getDefaults(params) {
	if (!params.mapKey)
		params.mapKey = "uniqueMapKey";

	var defStylePoint =
		" {marker-fill: #FF6600;marker-opacity: 1;marker-width: 16;marker-line-color: white;marker-line-width: 3;marker-line-opacity: 0.9;marker-placement: point;marker-type: ellipse;marker-allow-overlap: true;}";
	var defStyleLine = " {line-color:#FF6600; line-width:1; line-opacity: 0.7;}";
	var defStylePoly = " {polygon-fill:#FF6600; polygon-opacity: 0.7; line-opacity:1; line-color: #FFFFFF;}";

	var defaultStyle = _.template(
		'#<%= mapKey %>["mapnik::geometry_type"=1]' +
		defStylePoint +
		'#<%= mapKey %>["mapnik::geometry_type"=2]' +
		defStyleLine +
		'#<%= mapKey %>["mapnik::geometry_type"=3]' +
		defStylePoly);


	return {
		datasource: "database",
		dbtype: serverOptions.dbtype,
		dbname: "windwalker_test",
		style: defaultStyle(params),
		sql: "(SELECT * FROM test_table) as q",
		x: 4,
		y: 4,
		z: 4,
		geom_type: "polygon",
		format: "png"
	};
}

suite("renderCache",
	function() {

		// initialize core mml_store
		var mmlStore = new grainstore.MMLStore(serverOptions.grainstore);

		test("true",
			function(done) {
				assert.equal(global.environment.name, "test");
				done();
			});

		test("renderCache has a cached of render objects",
			function(done) {
				var renderCache = new RenderCache(1000, mmlStore);
				assert.ok(_.isObject(renderCache.renderers));
				done();
			});

		test("renderCache can create a unique key from request, stripping xyz/callback",
			function(done) {
				var renderCache = new RenderCache(1000, mmlStore);
				var req = { params: { sql: "select *", geom_type: "point" } };
				_.defaults(req.params, getDefaults(req.params));
				delete req.params.style;

				assert.equal(renderCache.createKey(req.params),
					"uniqueMapKey:database::windwalker_test:png:point:select *::");
				done();
			});

		test("renderCache can generate a tilelive object",
			function(done) {
				var renderCache = new RenderCache(1000, mmlStore);

				var req = { params: {} };
				_.defaults(req.params, getDefaults(req.params));

				renderCache.getRenderer(req,
					function(err, renderer) {
						assert.ok(renderer, err);
						assert.equal(renderer._uri.query.base.split(":")[0], "uniqueMapKey");
						done();
					});
			});

		test("renderCache can generate a tilelive object from file",
			function(done) {
				var renderCache = new RenderCache(1000, mmlStore);
				var req = { params: { pathname: "./test/fixtures/test_table_13_4011_3088.xml" } };
				_.defaults(req.params, getDefaults(req.params));

				renderCache.getRenderer(req,
					function(err, renderer) {
						assert.ok(renderer, err);
						assert.equal(renderer._uri.xml, null);
						assert.equal(renderer._uri.pathname, path.resolve(req.params.pathname));
						done();
					});
			});

		test("renderCache can generate > 1 tilelive object",
			function(done) {
				var renderCache = new RenderCache(1000, mmlStore);
				var req = { params: {} };
				_.defaults(req.params, getDefaults(req.params));

				renderCache.getRenderer(req,
					function(err, renderer) {
						assert.ok(renderer, err);
						req = { params: { sql: "(select * FROM test_table_2) as q" } };
						_.defaults(req.params, getDefaults(req.params));
						renderCache.getRenderer(req,
							function() {
								assert.equal(_.keys(renderCache.renderers).length, 2);
								done();
							});
					});
			});


		test("renderCache can reuse tilelive object",
			function(done) {
				var renderCache = new RenderCache(1000, mmlStore);
				var req = { params: {} };
				_.defaults(req.params, getDefaults(req.params));

				renderCache.getRenderer(req,
					function(err, renderer) {
						assert.ok(renderer, err);
						renderCache.getRenderer(req,
							function() {
								assert.equal(_.keys(renderCache.renderers).length, 1);
								done();
							});
					});
			});

		test("renderCache can delete all tilelive objects when reset",
			function(done) {
				var renderCache = new RenderCache(1000, mmlStore);

				var req = { params: {} };
				_.defaults(req.params, getDefaults(req.params));

				renderCache.getRenderer(req,
					function(err, renderer) {
						assert.ok(renderer, err);
						var req = { params: { sql: "(SELECT * FROM test_table_2) as q" } };
						_.defaults(req.params, getDefaults(req.params));
						renderCache.getRenderer(req,
							function() {
								assert.equal(_.keys(renderCache.renderers).length, 2);

								renderCache.reset(req);

								assert.equal(_.keys(renderCache.renderers).length, 0);
								done();
							});
					});
			});


		test("renderCache can delete only related tilelive objects when reset",
			function(done) {
				var renderCache = new RenderCache(1000, mmlStore);

				var req = { params: {} };
				_.defaults(req.params, getDefaults(req.params));
				req.params.mapKey = "key2";

				renderCache.getRenderer(req,
					function(err, renderer) {
						assert.ok(renderer, err);
						req.params.mapKey = "key1";
						req.params.sql = "(SELECT * FROM test_table) as q2";
						renderCache.getRenderer(req,
							function(err, renderer) {
								assert.ok(renderer, err);
								req.params.mapKey = "key1";
								req.params.sql = "(SELECT * FROM test_table) as q3";

								renderCache.getRenderer(req,
									function(err, renderer) {
										assert.ok(renderer, err);
										assert.equal(_.keys(renderCache.renderers).length, 3);

										renderCache.reset(req);

										assert.equal(_.keys(renderCache.renderers).length, 1);
										done();
									});
							});
					});
			});


		test("renderCache can purge all tilelive objects",
			function(done) {
				var renderCache = new RenderCache(1000, mmlStore);

				var req = { params: {} };
				_.defaults(req.params, getDefaults(req.params));


				renderCache.getRenderer(req,
					function(err, renderer) {
						assert.ok(renderer, err);
						req.params.sql = "(SELECT * FROM test_table) as q2";

						renderCache.getRenderer(req,
							function() {
								req.params.sql = "(SELECT * FROM test_table) as q3";
								req.params.mapKey = "key2";

								renderCache.getRenderer(req,
									function() {
										assert.equal(_.keys(renderCache.renderers).length, 3);

										req.params.mapKey = "key3";
										renderCache.purge();

										assert.equal(_.keys(renderCache.renderers).length, 0);
										done();
									});
							});
					});
			});

		test("renderCache automatically deletes tilelive only after timeout",
			function(done) {
				var renderCache = new RenderCache(5, mmlStore);
				var req = { params: {} };
				_.defaults(req.params, getDefaults(req.params));


				renderCache.getRenderer(req,
					function(err, renderer) {
						assert.ok(renderer, err);
						assert.equal(_.keys(renderCache.renderers).length, 1);
						global.setTimeout(function() {
								assert.equal(_.keys(renderCache.renderers).length, 0);
								done();
							},
							10);
					});
			});

	});