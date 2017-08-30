var css4console = `
	font-weight: bold;
	font-family: "courier new"
	`;

var _log = console.log;


var isArray  = Array.isArray;
var isObject = function(obj) {
	return typeof o === 'object';
}

console.log = function(o){
	if(isArray(o) || isObject(o)) {
		_log("%c" + JSON.stringify(o), css4console);
	} else {
		_log("%c" + o, css4console);
	}
};
