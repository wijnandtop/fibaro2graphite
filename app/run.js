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

    // console.log(data);

    //add temperature statistics
	var filtered = jsonQuery('[*type=com.fibaro.temperatureSensor]', {
		data: data
	});

	filtered.value.forEach(function(device, index) {
        metric.put(device.name, device.properties.value);
	});

    //add licht (lux) statistics
    var filtered = jsonQuery('[*type=com.fibaro.lightSensor]', {
        data: data
    });

    filtered.value.forEach(function(device, index) {
        metric.put(device.name, device.properties.value);
    });

    //add light (lux) statistics
    var filtered = jsonQuery('[*type=com.fibaro.humiditySensor]', {
        data: data
    });

    filtered.value.forEach(function(device, index) {
        metric.put(device.name, device.properties.value);
    });

    //add uv statistics
    var filtered = jsonQuery('[*name~/.uv$/i]', {
        data: data,
        allowRegexp: true
    });
    filtered.value.forEach(function(device, index) {
        metric.put(device.name, device.properties.value);
    });

    data.forEach(function(device, index) {
        if(device.interfaces != undefined && device.interfaces.indexOf("energy") != -1) {
            metric.put(device.name + ".energy.current", device.properties.power);
            metric.put(device.name + ".energy.total", device.properties.energy);
        }
    });


});