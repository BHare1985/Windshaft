// caches render objects and purges them after 60 seconds of inactivity
// also has functions to purge all.

var step = require("step");
var _ = require("underscore");
var tilelive = require("tilelive");

require("tilelive-mapnik").registerProtocols(tilelive);
require("tilelive-bridge").registerProtocols(tilelive);

module.exports = function(timeout, mmlStore) {

	var renderKeyTemplate =
		"<%= mapKey %>:<%= datasource %>:<%= pathname %>:<%= dbname %>:<%= format %>:<%= geom_type %>:<%= sql %>:<%= interactivity %>:<%= style %>";
	var baseKeyTemplate = "<%= mapKey %>";

	var me = {
		renderers: {},
		timeouts: {},
		timeout: timeout || 60000
	};

	// Create a string ID from a datasource.
	me.createKey = function(params) {
		var opts = _.extend({}, params); // as params is a weird arrayobj right here
		delete opts.x;
		delete opts.y;
		delete opts.z;
		delete opts.callback;
		_.defaults(opts,
			{
				mapKey: "",
				datasource: "",
				pathname: "",
				dbname: "",
				format: "",
				geom_type: "",
				sql: "",
				interactivity: "",
				style: ""
			});
		return _.template(renderKeyTemplate, opts);
	};

	// Acquire preconfigured mapnik resource.
	// - `options` {Object} options to be passed to constructor
	// - `callback` {Function} callback to call once acquired.
	me.acquire = function(options, callback) {
		var id = this.makeId(options);
		if (!this.pools[id]) {
			this.pools[id] = this.makePool(id, options);
		}
		this.pools[id].acquire(function(err, resource) {
			callback(err, resource);
		});
	};


	// if renderer exists at key, return it, else generate a new one and save at key
	me.getRenderer = function(req, callback) {

		// TODO: this is very suboptimal
		if (req.params.cache_buster) {
			this.reset(req);
		}

		var key = this.createKey(req.params);
		var that = this;

		if (this.renderers[key]) {
			// reset cache timeout
			global.clearTimeout(this.timeouts[key]);
			that.timeouts[key] = global.setTimeout(that.del.bind(that, key), that.timeout);

			return callback(null, this.renderers[key]);
		}

		step(
			function() {
				that.makeRenderer(req.params, this);
			},
			function(err, data) {
				if (err) throw err;

				// only cache the first. throw the rest away
				// TODO Check that the GC properly garbage collects these single use renderers
				if (!that.renderers[key])
					that.renderers[key] = data;

				if (!that.timeouts[key])
					that.timeouts[key] = global.setTimeout(that.del.bind(that, key), that.timeout);

				callback(err, data);
			},
			function handleError(err, data) {
				callback(err, data);
			}
		);
	};

	me.makeRenderer = function(params, callback) {
		var that = this;

		step(
			function getXmlPathOrString() {
				if (params.pathname) {
					return this(null, null, params.pathname);
				}

				mmlStore.mml_builder(params).toXML(this);
			},
			function loadMapnik(err, xml, pathname) {
				if (err) throw err;

				var query = {
					base: that.createKey(params) + new Date().getTime(),
					metatile: 1,
					bufferSize: 64
				};

				var uri = {
					query: query,
					protocol: params.format === "pbf" ? "bridge:" : "mapnik:",
					slashes: true,
					xml: xml,
					pathname: pathname
				};

				tilelive.load(uri, this);
			},
			function returnCallback(err, source) {
				callback(err, source);
			}
		);
	};

	me.purge = function() {
		var that = this;
		_.each(_.keys(that.renderers),
			function(key) {
				that.del(key);
			});
	};


	// Clears out all renderers related to a given table, regardless of other arguments
	// TODO: Make less blocking
	me.reset = function(req) {
		var baseKey = _.template(baseKeyTemplate, req.params);
		var regex = new RegExp("^" + baseKey + ".*");
		var that = this;

		_.each(_.keys(this.renderers),
			function(key) {
				if (key.match(regex)) {
					that.del(key);
				}
			});
	};

	// drain render pools, remove renderer and associated timeout calls
	me.del = function(id) {
		this.renderers[id]._pool.destroyAllNow();
		delete this.renderers[id];
		if (this.timeouts[id]) {
			global.clearTimeout(this.timeouts[id]);
			delete this.timeouts[id];
		}
	};


	return me;
};