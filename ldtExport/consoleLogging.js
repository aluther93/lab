module.exports = {
	setVerbose:setVerbose,
	log:log
}

const config = require('./ldtExportConfig');
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
			console.log(config.zeitStempel() +" "+ msg);
		}else if(!isVerbose){
			console.log(config.zeitStempel() +" "+ msg);
		}
	} 
}