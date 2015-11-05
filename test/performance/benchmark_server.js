var _ = require('underscore');
var Windwalker = require('../../lib');


// sanity check
var ENV = process.argv[2]
if (ENV != 'development' && ENV != 'production'){
    console.error("\nnode app.js [environment]");
    console.error("environments: [development, production]\n");
    process.exit(1);
}

// set environment specific variables
global.settings     = require('../../config/settings');
global.environment  = require('../../config/environments/' + ENV);
_.extend(global.settings, global.environment);

var ServerOptions = require('../support/server_options.js');
var server = new Windwalker.Server(ServerOptions);

server.listen(global.environment.windwalkerPort);
console.log("Windwalker tileserver started on port " + global.environment.windwalkerPort);