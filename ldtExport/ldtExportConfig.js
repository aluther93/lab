const utf8 = require('utf8');
module.exports = {
	sql: {host:'localhost',user:'alex22', password:'donnerdaumen93', database:'labor'},
	exportPath:"./",
	zeitStempel:zeitStempel
}
function zeitStempel(){
	var date = new Date();
	var timeZoneDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
	var stringFormat = timeZoneDate.toISOString();
	stringFormat = stringFormat.replace("T", " ");
	stringFormat = stringFormat.slice(0, 19);
	return stringFormat;
}