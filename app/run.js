var Fibaro = require('../lib/fibaro');
var jsonQuery = require('json-query');
var graphite = require('graphite');
var config = require('../config/settings');
var client = graphite.createClient('plaintext://'+config.graphite.hostname+':'+config.graphite.port+'/');

var fibaro = new Fibaro(config.fibaro.hostname, config.fibaro.login, config.fibaro.password);

fibaro.api.devices.list(function(err, data) {
	var filtered = jsonQuery('[*type=com.fibaro.temperatureSensor]', {
		data: data
	});


	var entries = {};
	filtered.value.forEach(function(device, index) {
		console.log("Added:" + device.name + " " + device.properties.value);
		entries[config.graphite.basename + device.name] = device.properties.value;

	});

	client.write(entries, function(err) {
		// if err is null, your data was sent to graphite!
		console.log(err);
	});

	// console.log(process._getActiveHandles());
	process._getActiveRequests();
	// console.log(filtered.value);
});