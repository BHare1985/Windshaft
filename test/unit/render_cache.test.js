var   _             = require('underscore')
    , sys           = require('sys')
    , th            = require('../support/test_helper.js')
    , assert        = require('assert')
    , grainstore    = require('grainstore')
    , RenderCache   = require('../../lib/windshaft/render_cache.js')
    , serverOptions = require('../support/server_options')
    , tests         = module.exports = {};

// initialize core mml_store
var mml_store  = new grainstore.MMLStore(serverOptions.redis, serverOptions.grainstore);

suite('render_cache', function() {

    test('true', function() {
        assert.equal(global.environment.name, 'test');
    });

    test('render_cache has a cached of render objects', function(){
        var render_cache = new RenderCache(100, mml_store);
        assert.ok(_.isObject(render_cache.renderers));
    });

    test('render_cache can create a unique key from request, stripping xyz/callback', function(){
        var render_cache = new RenderCache(100, mml_store);
        var req = {params: {dbname: "windshaft_test", table: 'test_table', x: 4, y:4, z:4, sql:"select *", geom_type:'point', format:'png' }};

        assert.equal(render_cache.createKey(req.params), 'windshaft_test:test_table:png:point:select *::');
    });

    /**
     * THE FOLLOWING TESTS NEED SOME DB SETUP
     * They need a database setup as below with the table test_table defined
     */

    test('render_cache can generate a tilelive object', function(){
        var render_cache = new RenderCache(100, mml_store);
        var req = {params: {dbname: "windshaft_test", table: 'test_table', x: 4, y:4, z:4, geom_type:'polygon', format:'png' }};

        render_cache.getRenderer(req, function(err, renderer){
            assert.ok(renderer, err);
            assert.equal(renderer._uri.query.base.split(':')[0], 'windshaft_test');
        });
    });


    test('render_cache can generate > 1 tilelive object', function(){
        var render_cache = new RenderCache(100, mml_store);
        var req = {params: {dbname: "windshaft_test", table: 'test_table', x: 4, y:4, z:4, geom_type:'polygon', format:'png' }};

        render_cache.getRenderer(req, function(err, renderer){
            assert.ok(renderer, err);
            req = {params: {dbname: "windshaft_test", table: 'test_table_2', x: 4, y:4, z:4, geom_type:'polygon', format:'png' }};
            render_cache.getRenderer(req, function(err, renderer2){
                assert.equal(_.keys(render_cache.renderers).length, 2);
            });
        });
    });


    test('render_cache can reuse tilelive object', function(){
        var render_cache = new RenderCache(100, mml_store);
        var req = {params: {dbname: "windshaft_test", table: 'test_table', x: 4, y:4, z:4, geom_type:'polygon', format:'png' }};

        render_cache.getRenderer(req, function(err, renderer){
            assert.ok(renderer, err);
            render_cache.getRenderer(req, function(err, renderer){
                assert.equal(_.keys(render_cache.renderers).length, 1);
            });
        });
    });

    test('render_cache can delete all tilelive objects when reset', function(){
        var render_cache = new RenderCache(100, mml_store);

        var req = {params: {dbname: "windshaft_test", table: 'test_table', x: 4, y:4, z:4, geom_type:'polygon', format:'png' }};
        render_cache.getRenderer(req, function(err, renderer){
            assert.ok(renderer, err);

            var req = {params: {dbname: "windshaft_test", table: 'test_table', x: 4, y:4, z:4, geom_type:'polygon', format:'png',
                sql: "(SELECT * FROM test_table LIMIT 50) as q" }};
            render_cache.getRenderer(req, function(err, renderer){
                assert.equal(_.keys(render_cache.renderers).length, 2);

                render_cache.reset(req);

                assert.equal(_.keys(render_cache.renderers).length, 0);
            });
        });
    });


    test('render_cache can delete only related tilelive objects when reset', function(){
        var render_cache = new RenderCache(100, mml_store);

        var req = {params: {dbname: "windshaft_test", table: 'test_table', x: 4, y:4, z:4, geom_type:'polygon', format:'png' }};
        render_cache.getRenderer(req, function(err, renderer){
            assert.ok(renderer, err);
            req.params.sql = "(SELECT * FROM test_table LIMIT 50) as q";

            render_cache.getRenderer(req, function(err, renderer){
                delete req.params.sql;
                req.params.table = 'test_table_2';

                render_cache.getRenderer(req, function(err, renderer){
                    assert.equal(_.keys(render_cache.renderers).length, 3);

                    req.params.table = 'test_table';
                    render_cache.reset(req);

                    assert.equal(_.keys(render_cache.renderers).length, 1);
                });
            });
        });
    });


    test('render_cache can purge all tilelive objects', function(){
        var render_cache = new RenderCache(100, mml_store);

        var req = {params: {dbname: "windshaft_test", table: 'test_table', x: 4, y:4, z:4, geom_type:'polygon', format:'png' }};

        render_cache.getRenderer(req, function(err, renderer){
            assert.ok(renderer, err);
            req.params.sql = "(SELECT * FROM test_table LIMIT 50) as q";

            render_cache.getRenderer(req, function(err, renderer){
                delete req.params.sql;
                req.params.table = 'test_table_2';

                render_cache.getRenderer(req, function(err, renderer){
                    assert.equal(_.keys(render_cache.renderers).length, 3);

                    req.params.table = 'test_table';
                    render_cache.purge();

                    assert.equal(_.keys(render_cache.renderers).length, 0);
                });
            });
        });
    });

    test('render_cache automatically deletes tilelive only after timeout', function(){
        var render_cache = new RenderCache(5, mml_store);
        var req = {params: {dbname: "windshaft_test", table: 'test_table', x: 4, y:4, z:4, geom_type:'polygon', format:'png' }};

        render_cache.getRenderer(req, function(err, renderer){
            assert.ok(renderer, err);
            assert.equal(_.keys(render_cache.renderers).length, 1);
            setTimeout(function(){assert.equal(_.keys(render_cache.renderers).length, 0);},10);
        });
    });

});

