module.exports = {
	verifyLine:verifyLine,
	isTypeCallback:isTypeCallback,
	consoleNewPara:consoleNewPara,
	getDatum:getDatum,
	verifyRefinedLine:verifyRefinedLine,
	readByteLength:readByteLength,
	isBodyConsistent:isBodyConsistent,
	condenseLines:condenseLines,
	findPathInArgv:findPathInArgv
}
let con = require('./consoleLogging');

function verifyLine(line){
	return (line.length + 2) == parseInt(line.substring(0,3));
}
function verifyRefinedLine(line){
	return (line.length) == parseInt(line.substring(0,3));
}
function isTypeCallback(suspect){
	if(typeof suspect == 'function') return true;
	return false;
}
function consoleNewPara(alt){
	if(alt){
		con.log(true,false,"_________________________________________________________________");	
		return;
	}
	con.log(true,false,"-----------------------------------------------------------------");
}
function getDatum(){
	return new Promise((resolve, reject)=>{
		con.log(true," DATUM wird bestimmt....")
		var today = new Date();
		var dd = String(today.getDate()).padStart(2, '0');
		var mm = String(today.getMonth() + 1).padStart(2, '0');
		var yyyy = today.getFullYear();
		resolve({'datum':dd+mm+yyyy});
	});
}
function readByteLength(line){
	var length = line.substring(0,3);
	var intLength = parseInt(length);
	return intLength;
}
function isBodyConsistent(bodyToCheck, forceResult){
	return new Promise((resolve,reject)=>{
		var maxIndex = bodyToCheck.length - 1;
		var noErrors = true;
		for(i in bodyToCheck){
			if(bodyToCheck[i] != null){
				if(!verifyLine(bodyToCheck[i])){
					noErrors = false;
				} 
			}
			if(i == maxIndex){
				if(noErrors){
					con.log(true," PRÜFSUMMEN der BEFUNDE überprüft");
					resolve(bodyToCheck);
				}else{
					reject(">>>ERROR: DER BEFUND IST NICHT WIEDERHERSTELLBAR!");
				}
			}
		}
	});
}
function condenseLines(arr){
	var condensat = "";
	var seperatedParts = [];
	for(i in arr){
		if(condensat == ""){
			condensat = arr[i];
		}else{
			condensat = condensat+","+arr[i];
		}
		if(verifyLine(condensat)){
			seperatedParts.push(condensat);
			condensat = "";
		}
	}
	return seperatedParts;
}
function findPathInArgv(){
	return;
}