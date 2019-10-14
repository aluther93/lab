module.exports = {
	setVerbose:setVerbose,
	log:log
}
var verbose = false;
function setVerbose(){
	return new Promise((resolve,reject)=>{
		verbose = true;
		if(verbose == true){
		 resolve();
		}else{
			reject()
		}
	});
	x = 1
}
// WENN MSG FALSE IST WIRD KEIN ZEITSTEMPEL ERSTELLT
// CONSOLENAUSGABE KANN ÜBER ALT GESTEUERT WERDEN wenn !msg
function log(isVerbose, msg, alt){
	if(!msg){
		if(isVerbose && verbose){
			console.log(alt);
		}else if(!isVerbose){
			console.log(alt);
		}
	}else{
		if(isVerbose && verbose){
			console.log(zeitStempel() +" "+ msg);
		}else if(!isVerbose){
			console.log(zeitStempel() +" "+ msg);
		}
	} 
}
function zeitStempel(){
	var date = new Date();
	var timeZoneDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
	var stringFormat = timeZoneDate.toISOString();
	stringFormat = stringFormat.replace("T", " ");
	stringFormat = stringFormat.slice(0, 19);
	return stringFormat;
}