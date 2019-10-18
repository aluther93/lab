module.exports = {
	buildDocHeader:buildDocHeader,
	getBytesNeeded:getBytesNeeded,
	stop:stop,
	getPath:getPath,
	assembleAndCreate:assembleAndCreate,
	generateFileName:generateFileName,
	setPath:setPath
}
var rootconfig = require('../rootconfig');
let fs = require('fs');
let con = require('./consoleLogging');
var ctt = require('./codeTableTranslator');

var finalFileName = null;
var path = null;
var documentArr = [];
var zwingendErforderlich = {
	'8000':'satzart',
	'8100':'satzlänge',
	'9212':'ldtVersion',
	'0201':'bsnr1',
	'0203':'bsnr2',
	'0205':'strasse',
	'0216':'ort',
	'0215':'plz',
	'0101':'kbv',
	'9106':'zeichensatz',
	'8312':'kundenNr',
	'9103':'datum'
};
var zeichensatzIdent = 0;
function buildDocHeader(arr){
	console.log(arr)
	return new Promise((resolve,reject)=>{
		var counter = 0;
		for(i in zwingendErforderlich){
			var satz = '';
			var wort = zwingendErforderlich[i];
			if(typeof arr[wort] != 'undefined'){
				if(wort == 'zeichensatz') zeichensatzIdent = arr[wort];
				satz = String(i) + String(arr[wort]); 
				documentArr[counter] = getBytesNeeded(satz) + satz + stop();
			}
			if(wort == 'satzlänge'){
				documentArr[counter] = bestimmeBlockLänge;
			} 
			counter++;
		}
		resolve(documentArr);
	});	
}
function setPath(value){
	path = value;
}

function istFeldkennzeichnung(line, fk){
	var length = line.substring(0,3);
	var splitLine = line.split(fk);
	return splitLine[0] == length;

}
function stop(){
	return String.fromCharCode(13,10);
}
function getBytesNeeded(line){
	return String(line.length + 5).padStart(3, '0')
}
function bestimmeBlockLänge(arr){
	var byteCount = 0;
	var satz1 = null;
	var satz2 = null;
	var satz3 = null;
	for(i in arr){
		if(typeof arr[i] == 'string'){
			byteCount = byteCount + arr[i].length;
		}
	}

	satz1 = '8100' + String(byteCount);
	var satzLänge = parseInt(getBytesNeeded(satz1));
	satz2 = '8100' + String(byteCount + satzLänge);
	if(getBytesNeeded(satz1) != getBytesNeeded(satz2)){
		satz3 = '8100' + String(byteCount + parseInt(getBytesNeeded(satz2)));
		return getBytesNeeded(satz3) + satz3 + stop();
	}

	return getBytesNeeded(satz2) + satz2 + stop();
}
function getPath(){
	return new Promise((resolve,reject)=>{
		if(path == null){
			path = rootconfig.exportPath;
		}
		isValidPath(path).then(resolve,reject);
	});
}
function returnFalse(){
	return false;
}
function divideBody(body){
	var returnArr = [];
	var currentBefund = [];
	for(var i in body){
		if(checkLineForCode(body[i], "8000")==1){
			if(currentBefund.length != 0){
				returnArr.push(currentBefund);
			}
			currentBefund = [];
		}
		currentBefund.push(body[i])
	}
	returnArr.push(currentBefund);
	return returnArr;
}
function recalculateBlockSizeOfBody(body){

	var befundeContainer = divideBody(body);
	for(var i in befundeContainer){
		var calculatedBlockLength = bestimmeBlockLänge(befundeContainer[i])
		for(var j in befundeContainer[i]){
			if(checkLineForCode(befundeContainer[i][j], "8100")==1){
				befundeContainer[i].splice(j,1);
				befundeContainer[i].splice(j,0,bestimmeBlockLänge(befundeContainer[i]))		
			}
		}
	}
	var newBody = [];
	for(var x in befundeContainer){
		for(var y in befundeContainer[x]){
			newBody.push(befundeContainer[x][y]);
		}
	}
	return newBody
}
function assembleAndCreate(header, body, footer, fn, zs){
	return new Promise((resolve,reject)=>{

		body = recalculateBlockSizeOfBody(body);
		var fullDocString = header.join('') + body.join('') + footer.join('');
		ctt.parseText(fullDocString, zs).then((buff)=>{
			fs.writeFile(fn, buff,(err)=>{
				if(!err){
					resolve();
				}
				reject(">>> ERROR: FILE konnte nicht erstellt werden");
			});
		},(e)=>{
			console.log(e)
			reject()
		})
	});
}
function isValidPath(x){
	return new Promise((resolve,reject)=>{
		fs.access(x, fs.F_OK, (err) => {
		  if (err) {
		  	if(x == process.argv[3]){
		  		process.exit('>>> ERROR: Der angegebene Pfad existiert nicht!');
		  	}
		    process.exit("Der im Config File angegebene Pfad ist nicht gültig!");
		    return
		  }else{
		  	con.log(true," PATH wurde VERIFIZIERT");
		  	con.log(true," PATH ist " + x);
		  	resolve();
		  }
		});
		
	});
}
function generateFileName(){
	return new Promise((resolve,reject)=>{
		var fileName = "";
		switch(zeichensatzIdent){
			case '1':
				fileName = fileName + "S";
				break;
			case '2':
				fileName = fileName + "X";
				break;
			case '3':
				fileName = fileName + "A";
				break;
			case '4':
				fileName = fileName + "Z";
				break;
			default:
				fileName = fileName + "S";
				break;
		}
		fileName = fileName + "01";
		var tempName = fileName + makeid(6) + ".ldt";
		var tempPath = path  + tempName;
		var freeNameSpace = fs.access(tempPath, fs.F_OK, (err)=>{
			if(err){
				if(err.errno == -4058){
					resolve(tempPath);
				}else{
					reject(err);
				}
			}else{
				resolve(false);
			}
		});
	});
}
function makeid(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}
function checkLineForCode(line, code){
	if(!line.includes(code)){
	 	return false;
	}else{
		const reservedCode = "XXXX"; 
		var lineSplit = line.split(code);
		var sum = parseInt(lineSplit[0]);
		var fieldlength = lineSplit[1].length;
		if(sum == 'NaN')
		{
			process.exit(" >>ERROR: Die Prüfsumme ist keine gültige Zahl.");
		}
		if(sum != fieldlength + code.length + 3)
		{
	//Fehlerbehebung falls Schlüssel mehrfach in Zeile vorkommt
			try
			{	
	// Array mit 3 Feldern ensteht aus einer Zeile wenn das gesuchte Wort 2 mal vorkommt
				if(lineSplit.length == 3)
				{
					
					var fixedLine = lineSplit[0] + reservedCode + lineSplit[1] + code + lineSplit[2];
					return 1 + checkSum(fixedLine, reservedCode);
					
				}
			}
			catch(e)
			{
				con.log(true,e)
				con.log(false,">> Error was caught! Handling: Line is corrupted. Ignore current line and proceed with next one.");
				return 0;
			}
		}
		else
		{
			return 1;
		}
		return 0;
	}
}