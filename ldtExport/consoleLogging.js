module.exports = {
	setVerbose:setVerbose,
	setRoutine:setRoutine,
	log:log
}
var verbose = false;
var routine = false;
function setVerbose(){
	return new Promise((resolve,reject)=>{
		verbose = true;
		routine = false;
		if(verbose == true){
		 resolve();
		}else{
			reject()
		}
	});
	x = 1
}
function setRoutine(){
	return new Promise((resolve,reject)=>{
		routine = true;
		if(routine == true){
		 resolve();
		}else{
			reject()
		}
	});
	x = 1
}
// WENN MSG FALSE IST WIRD KEIN ZEITSTEMPEL ERSTELLT
// CONSOLENAUSGABE KANN ÜBER ALT GESTEUERT WERDEN wenn !msg
function log(loggingMode, msg, alt){

	if(loggingMode > 1){
		console.log(zeitStempel() +" "+ msg);
	}

	if(routine){
		return;
	}

	if(typeof alt == "undefined"){
		alt = "";
	}

	if(!msg){
		if(loggingMode && verbose){
			console.log(alt);
		}else if(!loggingMode){
			console.log(alt);
		}
	}else{
		if(loggingMode && verbose){
			console.log(zeitStempel() +" "+ msg);
		}else if(!loggingMode){
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