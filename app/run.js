var Fibaro = require('../lib/fibaro');
var jsonQuery = require('json-query');
var graphite = require('graphite-udp');
var config = require('../config/settings');
var client = graphite.createClient('plaintext://'+config.graphite.hostname+':'+config.graphite.port+'/');

var metric = graphite.createClient({
    host: config.graphite.hostname,
    port: config.graphite.port,
    prefix: config.graphite.basename,
    interval: 2000,
    verbose: true,
    callback: function(error, metrics) {
        console.log('Metrics sent\n'+ metrics);
        console.log(error);
        metric.close();
        process.exit();
    }
})

var fibaro = new Fibaro(config.fibaro.hostname, config.fibaro.login, config.fibaro.password);

fibaro.api.devices.list(function(err, data) {
    var visible = jsonQuery('[*visible=true]', {
        data: data
    });
    visible = visible.value;

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


    //add motion sensor status
    var filtered = jsonQuery('[* type=com.fibaro.motionSensor | baseType=com.fibaro.motionSensor]', {
        data: visible
    });

    filtered.value.forEach(function(device, index) {
        var motionValue = 0;
        if (device.properties.value == "true") {
            motionValue = 1;
        }
        // console.log(device.name+".motion: "+ motionValue)
        metric.put(device.name+".motion", motionValue);
    });

    //add door sensor status
    var filtered = jsonQuery('[* type=com.fibaro.doorSensor | baseType=com.fibaro.doorWindowSensor]', {
        data: visible
    });

    filtered.value.forEach(function(device, index) {
        var motionValue = 0;
        if (device.properties.value == "true") {
            motionValue = 1;
        }
        metric.put(device.name+".open", motionValue);
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
            //lame way to skip unassigned metered devices.
            //@todo check if we can use hidden or disabled status.
            if(device.name.length != 5) {
                metric.put(device.name + ".energy.current", device.properties.power);
                metric.put(device.name + ".energy.total", device.properties.energy);
            }
        }
    });

    visible.forEach(function(device, index) {
        //store toggle / dimmer values
        if(device.actions != undefined && device.actions.turnOn != undefined) {
            if(device.name.length != 5) {
                if (device.actions.setValue != undefined) {
                    metric.put(device.name + ".switch.dimmer.value", device.properties.value);
                } else {
                    var switchvalue = 0;
                    if (device.properties.value == "true") {
                        switchvalue = 100;
                    }
                    metric.put(device.name + ".switch.toggle.value", switchvalue);
                }
            }
        }
    });

});

fibaro.call("diagnostics",null,function (err, data) {
    metric.put("controller.memory.free", data.memory.free);
    metric.put("controller.memory.cache", data.memory.cache);
    metric.put("controller.memory.buffers", data.memory.buffers);
    metric.put("controller.memory.used", data.memory.used);
    data.storage.internal.forEach(function(storage, index) {
        metric.put("controller.storage."+storage.name, storage.used);
    });
    data.cpuLoad.forEach(function(cpuLoad, index) {
        // console.log(cpuLoad);
        var cpu = false;
        if (cpuLoad.cpu0 != undefined) {
            var cpuName = "cpu0";
        } else if (cpuLoad.cpu1 != undefined) {
            var cpuName = "cpu1";
        }
        metric.put("controller.cpu."+cpuName+".user", cpuLoad[cpuName].user);
        metric.put("controller.cpu."+cpuName+".nice", cpuLoad[cpuName].nice);
        metric.put("controller.cpu."+cpuName+".system", cpuLoad[cpuName].system);
        metric.put("controller.cpu."+cpuName+".idle", cpuLoad[cpuName].idle);
    });
})