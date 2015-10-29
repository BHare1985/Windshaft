module.exports.name             = 'test';

//module.exports.dbtype			= "postgis";
//module.exports.datasource       = {user: 'postgres', password: '708050', host: '127.0.0.1', port: 5432};

module.exports.dbtype			= "mssql";
module.exports.datasource 		= {user: "sa", password: "sa", host: "ALIENWARE", port: 1433};
module.exports.windshaft_port   = 8080;
module.exports.enable_cors      = true;