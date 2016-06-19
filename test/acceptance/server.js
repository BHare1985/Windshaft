var   assertHTTP    = require('assert-http')
    , assert        = assertHTTP.assert
    , tests         = module.exports = {}
    , _             = require('underscore')
    , querystring   = require('querystring')
    , fs            = require('fs')
    , th            = require('../support/test_helper')
    , Windwalker     = require('../../lib')
    , ServerOptions = require('../support/server_options')
    , http          = require('http');


suite('server', function() {
    var listener;
    
	suiteSetup(function() {
		var server = new Windwalker.Server(ServerOptions);
		listener = server.listen(global.environment.windwalkerPort);
	});

	suiteTeardown(function() {
		listener.close();
	});


    test('get call to server returns 200', function(done) {
        assert.response({
            path: '/',
            port: global.environment.windwalkerPort,
        }, {
            status: 200
        }, function(err, res) {
            assert.ifError(err);
            done();
        });
    });

    test("get'ing a tile with default style should return an expected tile",  function(done){
        assert.response({
            url: '/database/Windwalker_test/table/test_table/13/4011/3088.png',
            encoding: 'binary',
            port: global.environment.windwalkerPort
        },{
            status: 200,
            headers: { 'Content-Type': 'image/png' }
        }, function(err, res){
            if (err) throw err;
            assertHTTP.imageEquals(new Buffer(res.body, 'binary'), fs.readFileSync('./test/fixtures/test_table_13_4011_3088.png'), null, function(err) {
                if (err) throw err;
                done();
            });
        });
    });

    test("get'ing a tile with default style and sql should return a constrained tile",  function(done){
        var sql = querystring.stringify({sql: "SELECT TOP 2 * FROM test_table"});
        
        assert.response({
            url: '/database/Windwalker_test/table/test_table/13/4011/3088.png?' + sql,
            encoding: 'binary',
            port: global.environment.windwalkerPort
        },{
            status: 200,
            headers: { 'Content-Type': 'image/png' }
        }, function(err, res){
            if (err) throw err;
            assertHTTP.imageEquals(new Buffer(res.body, 'binary'), fs.readFileSync('./test/fixtures/test_table_13_4011_3088_limit_2.png'), null, function(err) {
                if (err) throw err;
                done();
            });
        });
    });

    test("get'ing a tile with url specified style should return an expected tile",  function(done){
        var style = querystring.stringify({style: "#test_table{marker-fill: blue;marker-line-color: black;}"});
        assert.response({
            url: '/database/Windwalker_test/table/test_table/13/4011/3088.png?' + style,
            encoding: 'binary',
            port: global.environment.windwalkerPort
        },{
            status: 200,
            headers: { 'Content-Type': 'image/png' }
        }, function(err, res){
            if (err) throw err;
            assertHTTP.imageEquals(new Buffer(res.body, 'binary'), fs.readFileSync('./test/fixtures/test_table_13_4011_3088_styled.png'), null, function(err) {
                if (err) throw err;
                done();
            });
        });
    });

    test("get'ing a tile with url specified style should return an expected tile twice",  function(done){
        var style = querystring.stringify({style: "#test_table{marker-fill: black;marker-line-color: black;}"});
        
        assert.response({
            url: '/database/Windwalker_test/table/test_table/13/4011/3088.png?' + style,
            encoding: 'binary',
            port: global.environment.windwalkerPort
        },{
            status: 200,
            headers: { 'Content-Type': 'image/png' }
        }, function(err, res){
            if (err) throw err;
            assertHTTP.imageEquals(new Buffer(res.body, 'binary'), fs.readFileSync('./test/fixtures/test_table_13_4011_3088_styled_black.png'), null, function(err) {
                if (err) throw err;
                done();
            });
        });
    });

    test("dynamically set styles in same session and then back to default",  function(done){
        assert.response({
            url: '/database/Windwalker_test/table/test_table/13/4011/3088.png?' + querystring.stringify({style: "#test_table{marker-fill: black;marker-line-color: black;}"}),
            encoding: 'binary',
            port: global.environment.windwalkerPort
        },{
            status: 200,
            headers: { 'Content-Type': 'image/png' }
        }, function(err, res){
            if (err) throw err;
            assertHTTP.imageEquals(new Buffer(res.body, 'binary'), fs.readFileSync('./test/fixtures/test_table_13_4011_3088_styled_black.png'), null, function(err) {
                if (err) throw err;
                assert.response({
                    url: '/database/Windwalker_test/table/test_table/13/4011/3088.png?'  + querystring.stringify({style: "#test_table{marker-fill: blue;marker-line-color: black;}"}),
                    encoding: 'binary',
                    port: global.environment.windwalkerPort
                },{
                    status: 200,
                    headers: { 'Content-Type': 'image/png' }
                }, function(err, res){
                    if (err) throw err;
                    assertHTTP.imageEquals(new Buffer(res.body, 'binary'), fs.readFileSync('./test/fixtures/test_table_13_4011_3088_styled.png'), null, function(err) {
                        if (err) throw err;
                        assert.response({
                            url: '/database/Windwalker_test/table/test_table/13/4011/3088.png',
                            encoding: 'binary',
                            port: global.environment.windwalkerPort
                        },{
                            status: 200,
                            headers: { 'Content-Type': 'image/png' }
                        }, function(err, res){
                            if (err) throw err;
                            assertHTTP.imageEquals(new Buffer(res.body, 'binary'), fs.readFileSync('./test/fixtures/test_table_13_4011_3088.png'), null, function(err) {
                                if (err) throw err;
                                done();
                            });
                        });
                    });
                });
            });
        });
    });

    test("get'ing a json with default style and nointeractivity should return error",  function(done){
        assert.response({
            url: '/database/Windwalker_test/table/test_table/13/4011/3088.grid.json',
            port: global.environment.windwalkerPort
        },{
            status: 500,
        }, function(err, res){
            if (err) throw err;
            assert.deepEqual(res.body, 'Tileset has no interactivity');
            done();
        });
    });

    test("get'ing a json with default style and single interactivity should return a grid",  function(done){
        assert.response({
            url: '/database/Windwalker_test/table/test_table/13/4011/3088.grid.json?interactivity=name',
            port: global.environment.windwalkerPort
        },{
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }, function(err, res){
            if (err) throw err;

            var expected_json = {
                "1":{"name":"Hawai"},
                "2":{"name":"El Estocolmo"},
                "3":{"name":"El Rey del Tallarín"},
                "4":{"name":"El Lacón"},
                "5":{"name":"El Pico"}
            };
            assert.deepEqual(JSON.parse(res.body).data, expected_json);
            done();
        });
    });

    test("get'ing a json with default style and multiple interactivity should return a grid",  function(done){
        assert.response({
            url: '/database/Windwalker_test/table/test_table/13/4011/3088.grid.json?interactivity=name,address',
            port: global.environment.windwalkerPort
        },{
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }, function(err,res){
            if (err) throw err;

            var expected_json = {
                "1":{"address":"Calle de Pérez Galdós 9, Madrid, Spain","name":"Hawai"},
                "2":{"address":"Calle de la Palma 72, Madrid, Spain","name":"El Estocolmo"},
                "3":{"address":"Plaza Conde de Toreno 2, Madrid, Spain","name":"El Rey del Tallarín"},
                "4":{"address":"Manuel Fernández y González 8, Madrid, Spain","name":"El Lacón"},
                "5":{"address":"Calle Divino Pastor 12, Madrid, Spain","name":"El Pico"}
            };
            assert.deepEqual(JSON.parse(res.body).data, expected_json);
            done();
        });
    });


    test("get'ing a json with default style and sql should return a constrained grid",  function(done){
		assert.response({
            url: '/database/Windwalker_test/table/test_table/13/4011/3088.grid.json?' + querystring.stringify({interactivity: "name", sql: "SELECT TOP 2 * FROM test_table"}),
            port: global.environment.windwalkerPort
        },{
            status: 200,
            headers: { 'Content-Type': 'application/json; charset=utf-8' }
        }, function(err,res){
            if (err) throw err;
            var expected_json = JSON.parse(fs.readFileSync('./test/fixtures/test_table_13_4011_3088_limit_2.grid.json','utf8'));
            assert.deepEqual(JSON.parse(res.body), expected_json);
            done();
        });
    });

    test("get'ing a tile with CORS enabled should return CORS headers",  function(done){
        assert.response({
            url: '/database/Windwalker_test/table/test_table/6/31/24.png',
            port: global.environment.windwalkerPort
        },{
            status: 200,
            headers: {'Access-Control-Allow-Headers': 'X-Requested-With', 'Access-Control-Allow-Origin': '*'}
        }, function() { done(); });
    });

    test("beforeTileRender is called when the client request a tile",  function(done) {
        assert.response({
            url: '/database/Windwalker_test/table/test_table/6/31/24.png',
            port: global.environment.windwalkerPort
        },{
            status: 200,
            headers: {'X-BeforeTileRender': 'called'}
        }, function() { done(); });
    });

    test("afterTileRender is called when the client request a tile",  function(done) {
        assert.response({
            url: '/database/Windwalker_test/table/test_table/6/31/24.png',
            port: global.environment.windwalkerPort
        },{
            status: 200,
            headers: {'X-AfterTileRender': 'called', 'X-AfterTileRender2': 'called'}
        }, function() { done(); });
    });
    
	test("Database errors are sent in response body",  function(done) {
		var sql = querystring.stringify({sql: "BROKEN QUERY"})
		assert.response({
			url: '/database/Windwalker_test/table/test_table/6/31/24.png?' + sql,
            port: global.environment.windwalkerPort
		},{
			status: 500
		}, function(err, res) {
		  assert.ok(res.body.match(new RegExp(/syntax/)),
			  'Body does not contain the "syntax error" message: ' + res.body);
		  done();
		});
	});
});

