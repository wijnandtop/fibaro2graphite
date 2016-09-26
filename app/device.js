var Fibaro = require('../lib/fibaro');
var jsonQuery = require('json-query');
var config = require('../config/settings');

var fibaro = new Fibaro(config.fibaro.hostname, config.fibaro.login, config.fibaro.password);

fibaro.api.devices.list(function(err, data) {

    // console.log(data);

    //add temperature statistics
	var filtered = jsonQuery('[*id=' + process.argv[2] + ']', {
		data: data
	});
    console.log(filtered['value'][0]);


});