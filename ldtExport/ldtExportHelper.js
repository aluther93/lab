module.exports = {
	verifyLine:verifyLine,
	isTypeCallback:isTypeCallback,
	consoleNewPara:consoleNewPara,
	getDatum:getDatum,
	verifyRefinedLine:verifyRefinedLine,
	readByteLength:readByteLength,
	isBodyConsistent:isBodyConsistent,
	condenseLines:condenseLines,
	checkAllSums:checkAllSums
}
let con = require('./consoleLogging');

function verifyLine(line){
	return (line.length + 2) == parseInt(line.substring(0,3));
}
function checkAllSums(header,body,footer){
	var bytesTotal = 0;
	var expectedBytes = 0;
	var expectedBytesTotal = 0;
	for(var a in header){
		if(verifyRefinedLine(header[a])){
			bytesTotal = bytesTotal + readByteLength(header[a])
			if(checkLineForCode(header[a], "8100")==1){
				expectedBytes = expectedBytes + parseInt(header[a].split("8100")[1])
			}
		}else{
			process.exit(header[a])
		}
	}
	for(var b in body){
		if(verifyRefinedLine(body[b])){
			bytesTotal = bytesTotal + readByteLength(body[b])
			if(checkLineForCode(body[b], "8100")==1){
				expectedBytes = expectedBytes + parseInt(body[b].split("8100")[1])
			}
		}else{
			process.exit(body[b])
		}
	}
	for(var c in footer){
		if(verifyRefinedLine(footer[c])){
			bytesTotal = bytesTotal + readByteLength(footer[c])
			if(checkLineForCode(footer[c], "8100")==1){
				expectedBytes = expectedBytes + parseInt(footer[c].split("8100")[1])
			}
			if(checkLineForCode(footer[c], "9202")==1){
				expectedBytesTotal = expectedBytesTotal + parseInt(footer[c].split("9202")[1])
			}
		}else{
			process.exit(footer[c])
		}
	}
	a = "Die gezählten Prüfsummen ergeben "+bytesTotal;
	b = "Die Summe der 8100 Zeilen-Werte ergeben "+expectedBytes;
	c = "Die im Footer angegebene Gesamtbytezahl ist "+expectedBytesTotal;
	if(bytesTotal == expectedBytes && bytesTotal == expectedBytesTotal){
		return true;
	}else{
		process.exit(a+b+c);
	}
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