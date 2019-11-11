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
var ldtHelper = require('./ldtExportHelper')

var finalFileName = null;
var path = null;
var zeichensatzIdent = 0;

//Dieses Objekt stellt eine Bauanleitung für den gesamten Header dar. 
var headerBlueprint = {
	'8000':'satzart',
	'8100':'satzlänge',
	'9212':'ldtVersion',
	'0201': 'bsnr1',
	'0203': 'bsnr2',
	'0205': 'strasse',
	'0215': 'plz',
	'0216': 'ort',
	'8300': getLaborSig,
	'0101': getLaborSig,
	'9106':'zeichensatz',
	'8312': getLaborSig,
	'9103':'datum'
};
var headerOrder = [
	'8000',
	'8100',
	'9212',
	'0201',
	'0203',
	'0205',
	'0215',
	'0216',
	'8300',
	'0101',
	'9106',
	'8312',
	'9103'
]

function buildDocHeader(sqlResults){
	return new Promise((resolve,reject)=>{
		var documentArr = [];
		var code = '';
		for(i in headerOrder){
			code = headerOrder[i]
			if(typeof headerBlueprint[code] != 'undefined'){
				documentArr.push(buildHeaderLine(code, sqlResults));
			}
		}
		resolve(documentArr);
	});	
}
function buildHeaderLine(code, sqlResults){
	var satz = '';
	var instruction = headerBlueprint[code];
	if(typeof instruction == 'function'){
		var wort = instruction(code);
		satz = String(code) + String(wort);
		return getBytesNeeded(satz) + satz + stop();
	}else{
		if(instruction == 'zeichensatz'){
			zeichensatzIdent = sqlResults[instruction];
		}
		if(instruction == 'satzlänge'){
			return bestimmeBlockLänge;
		} 
		if(typeof sqlResults[instruction] != 'undefined'){
			satz = String(code) + String(sqlResults[instruction]); 
			return getBytesNeeded(satz) + satz + stop();
		}
	}
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
function bestimmeGesamtLänge(header,body,footer){
	var byteCount = 0;
	var satz1 = null;
	var satz2 = null;
	var satz3 = null;

	for(i in header){
		if(typeof header[i] == 'string'){
			byteCount = byteCount + header[i].length;
		}
	}
	for(i in body){
		if(typeof body[i] == 'string'){
			byteCount = byteCount + body[i].length;
		}
	}
	for(i in footer){
		if(typeof footer[i] == 'string'){
			byteCount = byteCount + footer[i].length;
		}
	}

	satz1 = '9202' + String(byteCount);
	var satzLänge = parseInt(getBytesNeeded(satz1));
	satz2 = '9202' + String(byteCount + satzLänge);
	if(getBytesNeeded(satz1) != getBytesNeeded(satz2)){
		satz3 = '9202' + String(byteCount + parseInt(getBytesNeeded(satz2)));
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
function buildFooter(header,body){
	var satzart = null;
	var footer = [];
	for(var i in header){
		if(checkLineForCode(header[i], "8000")==1){
			satzart = header[i].split("8000")[1].split("")
			satzart.splice(3,1,"1");
			satzart.splice(4,2);
			satzart = satzart.join("")
		}
	}
	footer.push("0138000"+satzart+stop());
	footer.push("0128100000000");
	footer.push(bestimmeGesamtLänge(header,body,footer))
	footer.splice(1,1);
	var blockLengthLine = bestimmeBlockLänge(footer);
	var value = blockLengthLine.substring(7,blockLengthLine.length - 2);
	var bitsToAdd = 4 - value.length;

	var lineCheckSum = String(parseInt(blockLengthLine.substring(0,3)) + bitsToAdd).padStart(3,'0');
	value = String(parseInt(value) + bitsToAdd).padStart(4,'0');
	footer.splice(1,0,lineCheckSum+"8100"+value+stop());
	return footer;

}
function assembleAndCreate(header, body, fn, zs){
	return new Promise((resolve,reject)=>{

		body = recalculateBlockSizeOfBody(body);
		footer = buildFooter(header,body);

		ldtHelper.checkAllSums(header, body, footer)

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
				if(err.code == 'ENOENT'){
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
				con.log(2,">> Error was caught! Handling: Line is corrupted. Ignore current line and proceed with next one.");
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
function getLaborSig(code){
	if(typeof rootconfig.labSignatur[code] == 'undefined'){
		process.exit("Eine zwingend erforderliche Zeile wurde nicht in der RootConfig-Datei deklariert. Zeile mit Code:'"+code+"' ist nicht definiert.")
	}
	return rootconfig.labSignatur[code];
}