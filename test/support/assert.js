// Cribbed from the ever prolific Konstantin Kaefer
// https://github.com/mapbox/tilelive-mapnik/blob/master/test/support/assert.js
// imageEqualsFile was updated

var fs = require('fs');
var util = require('util');
var path = require('path');
var http = require('http');
var spawn = require('child_process').spawn;
var exec = require('child_process').exec;
var existsSync = require('fs').existsSync || require('path').existsSync;
var mapnik = require('../../node_modules/tilelive-mapnik/node_modules/mapnik');

var assert = module.exports = exports = require('assert');

assert.imageEqualsFile = function(buffer, file, meanError, callback) {
    if (typeof meanError == 'function') {
        callback = meanError;
        meanError = 0.05;
    }

    var fixturesize = fs.statSync(file).size;
    var sizediff = Math.abs(fixturesize - buffer.length) / fixturesize;
    if (sizediff > meanError) {
        return callback(new Error('Image size is too different from fixture: ' + buffer.length + ' vs. ' + fixturesize));
    }
    var expectImage = new mapnik.Image.open(file);
    var resultImage = new mapnik.Image.fromBytesSync(buffer);
    var pxDiff = expectImage.compare(resultImage);

    // Allow < 2% of pixels to vary by > default comparison threshold of 16.
    var pxThresh = resultImage.width() * resultImage.height() * 0.02;

    if (pxDiff > pxThresh) {
        callback(new Error('Image is too different from fixture: ' + pxDiff + ' pixels > ' + pxThresh + ' pixels'));
    } else {
        callback();
    }
}

// Brian's asset response function

var request = require('request');

assert.response = function(server, requestObj, responseObj, callback) {
	var serverUrl = "http://localhost:8080";
	request({
		method: requestObj.method,
		headers: requestObj.headers,
		url: serverUrl + requestObj.url,
		body: requestObj.data
	}, function (err, response) {
		if (err) { assert.ok(err); return; }
		
		if(responseObj.status !== undefined)
		assert.equal(response.statusCode, responseObj.status);

		if(responseObj.body !== undefined)
		assert.equal(response.body, responseObj.body);

		if(responseObj.headers !== undefined) {
			for (var k in responseObj.headers){
				if (responseObj.headers.hasOwnProperty(k)) {
					assert.equal(response.headers[k.toLowerCase()], responseObj.headers[k]);
				}
			}
		}
		callback(response);
	});
}
