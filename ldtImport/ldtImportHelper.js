
const reservedCode = "XXXX"; 
const sqlTemplate = {quelle:null,eins:null,labornr:null,aeDatum:null,status:'bereit',befArt:null,befTyp:null,orgid:null,vorsatz:null,name:null,zeichensatz:null,vorname:null,gebTag:null,ldtVersion:null,zeit:'GETDATE()',content:null};
const sqlPrimKey = {quelle:null,eins:null,labornr:null,aeDatum:null, zeit:null};
const con = require('./consoleLogging');


module.exports = {
	checkSum: checkSum,
	produceContainer: prodContainer,
	getParsedValue: getParsedValue,
	exitFunction:exitFunction,
	verifyLine: verifyLine,
	incUnsaveables:incUnsaveables,
	incUsers:incUsers,
	incTotalPaketsRead:incTotalPaketsRead,
	decTotalPaketsRead:decTotalPaketsRead
}
var totalPaketsRead = 0;
var unsaveable = 0;
var users = [];

function parseLineToDate(line){
	var year = line.substring(4,8);
	var month = line.substring(2,4);
	var day = line.substring(0,2);

	return year + month + day;
}
// Sammlung an Attributen die der Container aus dem Befund-Corpus übernimmt.
//ldtVersion, befArt und content fallen nicht unter diese Suche
// Factory für Container Elemente. Container entsprechen SQL Zeilen die noch nicht eingetragen wurden.
function prodContainer(lineStart){
	var container = {
		labornr:null,
		aeDatum:null,
		befTyp:null,
		orgid:null,
		vorsatz:null,
		name:null,
		vorname:null,
		gebTag:null,
		quelle:null,
		eins:null,
		befArt:null,
		zeichensatz:null,
		ldtVersion:null,
		lineStart:lineStart,
		lineEnd:null,
		content:[],
		formatContainer:()=>{
			//var sql = "SELECT * FROM befunde WHERE ";
			//var sql2 = "INSERT INTO befunde SET ";
			return;
		},
		set newLine(line){
			this.content.push(line)
		}
	}
	return container;
}
function incUsers(user){
	if(!users.includes(user)){
		users.push(user);
	}
}
function incTotalPaketsRead(){
	totalPaketsRead++;
}
function decTotalPaketsRead(){
	totalPaketsRead--;
}
function incUnsaveables(){
	unsaveable++;
}
function getSqlTemplate(){
	return sqlTemplate;
}
function getSqlPrimKey(){
	return sqlPrimKey;
}
function shareIdentifier(ident, obj1, obj2){
	if(typeof obj1[ident] == 'undefined' || typeof obj2[ident] == 'undefined')
	{
			return false;
	}
	return true;
} 
function getParsedValue(code, line){
	var output = line;
	var parseRules = {8301:parseLineToDate, 3103:parseLineToDate};
	if(parseRules.hasOwnProperty(code)){
		output = parseRules[code](line);
	}
	return output;
}
function exitFunction(msg){

	if(unsaveable > 0){
		msg0 = "> " + unsaveable;
		if(unsaveable == 1){
			msg0 = msg0 + " Befund ist nicht wiederherstellbar.";
		}else{
			msg0 = msg0 + " Befunde sind nicht wiederherstellbar.";
		}
		con.log(2,msg0);
	}
	if(msg == 0)
	{
		if(totalPaketsRead == 1){
			var msg1 = "> 1 Befund wurde"
		}else{
			msg1 = "> " + totalPaketsRead + " Befunde wurden"
		}
		msg1 = msg1 + " Erfolgreich importiert.";
		con.log(2,msg1);
		con.log(2, "> Befunde für Einsender: " + users)
	}else{
		con.log(2,msg);
	}
	return;
}
// Überprüft ob das gelesene Feld mit der Prüfsumme übereinstimmt
// >> line: die aktuelle Zeile die gelesen wird
// >> code: die erkannte Zeichenfolge welche das Feld beschreibt 
function checkSum(line, code){
	if(!line.includes(code)){
	 	return false;
	}else{
		var lineSplit = line.split(code);
		var sum = parseInt(lineSplit[0]);
		var fieldlength = lineSplit[1].length;
		if(sum == 'NaN')
		{
			process.exit(" >>ERROR: Die Prüfsumme ist keine gültige Zahl.");
		}
		if(sum != fieldlength + code.length + 5)
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
function verifyLine(line){
	return (line.length + 2) == parseInt(line.substring(0,3));
}
function inCaseOfReject(err){
	con.log(2,"THERE WAS AN UNEXPECTED REJECT");
}