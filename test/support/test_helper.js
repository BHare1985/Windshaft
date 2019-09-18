global.environment = require(__dirname + "/../../config/environments/test");

var fs = require("fs");
var path = require("path");
var os = require("os");

var oldDir = path.join(__dirname, "..", "..", "config", "mssql", "mssql-" + os.platform() + ".input");
var newDir = path.join(__dirname, "..", "..", "node_modules", "mapnik", "lib", "binding", "node-v46-" + os.platform() + "-x64", "mapnik", "input", "mssql-" + os.platform() + ".input");

fs.writeFileSync(newDir, fs.readFileSync(oldDir));