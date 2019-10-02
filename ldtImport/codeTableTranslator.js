module.exports = {
	lineToUtf8:lineToUtf8
}

var cptable = require('codepage');
var con = require('./consoleLogging');

//zeichensatz ist entweder false ODER {1,2,3,4}
//mixedInput gibt an ob sich im eingelesenen Dokument mehrere unterschiedliche Zeichensätze befinden 
//Bis zur gelesenen Zeile im Header bei dem der Zeichensatz definiert wird kann der Translator nicht eindeutig bestimmen wie geparsed wird
function lineToUtf8(line, enrolledZeichensatz){

	var parseLine = line;
	var codePage = null;

	var selfHex = "";
	for(i in line){
		selfHex += line[i].charCodeAt(0).toString(16) + " ";
	}
	selfHex = selfHex.split(" ");
	selfHex.pop();
	for(j in selfHex){
		selfHex[j] = Number('0x' + selfHex[j])
	}
	switch(enrolledZeichensatz){
		case "1":
			return cptable.utils.decode(65001, selfHex);
		case "2":
			return cptable.utils.decode(437, selfHex);
		case "3":
			return cptable.utils.decode(28591, selfHex);
		case "4":
			return cptable.utils.decode(28605, selfHex);
		default:
			return cptable.utils.decode(65001, selfHex);
	}
}
