var Fibaro = require('../lib/fibaro');
var jsonQuery = require('json-query');
var graphite = require('graphite-udp');
var config = require('../config/settings');
var client = graphite.createClient('plaintext://'+config.graphite.hostname+':'+config.graphite.port+'/');

var metric = graphite.createClient({
    host: config.graphite.hostname,
    port: config.graphite.port,
    prefix: config.graphite.basename,
    interval: 1000,
    verbose: true,
    callback: function(error, metrics) {
        console.log('Metrics sent\n'+ metrics);
        metric.close();
        process.exit();
    }
})

var fibaro = new Fibaro(config.fibaro.hostname, config.fibaro.login, config.fibaro.password);

fibaro.api.devices.list(function(err, data) {
	var filtered = jsonQuery('[*type=com.fibaro.temperatureSensor]', {
		data: data
	});


	var entries = {};
	filtered.value.forEach(function(device, index) {
		console.log("Added:" + device.name + " " + device.properties.value);
        metric.put(device.name, device.properties.value);
	});


    //
	// console.log(process._getActiveHandles());
	// process._getActiveRequests();
	// console.log(filtered.value);
});