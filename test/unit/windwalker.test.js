var   _             = require('underscore')
    , th            = require('../support/test_helper.js')
    , assert        = require('assert')
    , Windwalker     = require('../../lib')
    , serverOptions = require('../support/server_options')
    , tests         = module.exports = {};

suite('windwalker', function() {

    test('true',  function() {
        assert.equal(global.environment.name, 'test');
    });

    test('can instantiate a Windwalker object (configured express instance)',  function(){
        var ws = new Windwalker.Server(serverOptions);
        assert.ok(ws);
    });

    test('can spawn a new server on the global listen port',  function(){
        var ws = new Windwalker.Server(serverOptions);
        ws.listen(global.environment.windwalkerPort);
        assert.ok(ws);
        ws.close(); /* allow proper tear down */
    });

    test('throws exception if incorrect options passed in',  function(){
        assert.throws(
            function(){
                var ws = new Windwalker.Server({unbuffered_logging:true});
            }, /Must initialise Windwalker with a database type/
        );
    });

    test('options are set on main windwalker object',  function(){
        var ws = new Windwalker.Server(serverOptions);
        assert.ok(_.isFunction(ws.parameterParser));
        assert.equal(ws.tileRoute, '/database/:dbname/table/:table/:z/:x/:y.*');
    });

});
