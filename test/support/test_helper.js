/**
 * User: simon
 * Date: 30/08/2011
 * Time: 13:52
 * Desc: Loads test specific variables
 */

var _ = require('underscore');

// set environment specific variables
global.settings     = require(__dirname + '/../../config/settings');
global.environment  = require(__dirname + '/../../config/environments/test');
_.extend(global.settings, global.environment);



var fs = require('fs');
var path = require('path');
var os = require('os');

var oldDir = path.join(__dirname, '..', '..', 'config', 'mssql', 'mssql-'+os.platform()+'.input');
var newDir = path.join(__dirname, '..', '..', 'node_modules', 'mapnik', 'lib', 'binding', 'node-v14-'+os.platform()+'-x64', 'mapnik', 'input', 'mssql-'+os.platform()+'.input');

fs.writeFileSync(newDir, fs.readFileSync(oldDir));
