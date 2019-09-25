const ldtConfig = require('./ldtImportConfig');
const ldtHelper = require('./ldtImportHelper');
const sqlManager = require('./sqlManager');
const einsenderInfo = require('./einsenderInfo');
const con = require('./consoleLogging');
var readline = require('readline');
const utf8 = require('utf8');
var ctt = require('./codeTableTranslator');

var quellkuerzel;
var reservedCode = ldtConfig.reservedString // 4Byte Kombination die nicht in Ldts auftaucht

var readArray = [];
var i = 0;
var bool = true;
var processName = 'bereit';
var processState = "inactive";
var container = null;
var ldtVersion;
var befundSuche = ldtConfig.befundDaten;
var befundArten = ldtConfig.befundArten;
var containerStack = [];
var lineNumber = 0;
var unreadableHeader = false;
var unreadableBody = false;
var enrolledInputLine = [];
var enrolledZeichensatz = [];
var enrolledQuellkuerzel = [];
var running = false;


var rl = readline.createInterface({
  input: process.stdin.setEncoding('binary'),
  output: process.stdout,
  terminal: false
});


if(typeof process.argv[2] == 'undefined'){
	process.exit(">>ERROR: Bitte geben Sie eine Quelle an.");
}
if(typeof process.argv[3] != 'undefined'){
	var localArgs = process.argv;
	localArgs.shift();
	localArgs.shift();
	if(localArgs.includes('-v') || localArgs.includes('-verbose')){
		con.setVerbose()
	}
	for(i in localArgs){
		if(localArgs[i].charAt(0) != '-'){
			var quelle = localArgs[i];
		}
	}
	if(typeof quelle == 'undefined'){
		process.exit(">>ERROR: Das Quellkürzel ist nicht definiert.")
	}
}else{
		var quelle = process.argv[2];
}

process.on('exit', ldtHelper.exitFunction);

rl.on('line', (line)=>{
	//console.log(line)
	//console.log(ctt.lineToUtf8(line, 4, false, [4]))

	enrolledInputLine.push(line);
	findEncoding(line);

	if(enrolledZeichensatz.length > 0){
		trySetRunning().then(()=>{
			con.log(true, "Die Festgestellten Zeichensätze sind " + enrolledZeichensatz);
			mainLoop();
		}, ()=>{
			return;
		});
	} 
});
function findEncoding(line){
	if(ldtHelper.checkSum(line, "9106")){
		var tempArray = line.split("9106");
		enrolledZeichensatz.push(tempArray[1]);
	}
}
function trySetRunning(){
	return new Promise((resolve,reject)=>{
		if(!running && (running = true)){
			resolve();
		}else{
			reject();
		}
	});
}
function mainLoop(anyFlag){
	if(line = enrolledInputLine.shift()){
		running = true;
		lineNumber++;
		verifyAndHandleLine(line).then(mainLoop, process.exit)
	}else{
		running = false;
		sqlManager.disconnect();
	}
}
//Resolve ist TRUE wenn eine Flagge weiteres Lesen einschränken soll
function verifyAndHandleLine(lineToCheck){
	return new Promise((resolve,reject)=>{
		var line = ctt.lineToUtf8(lineToCheck);
		var lineAlt = ctt.lineToUtf8(lineToCheck, enrolledZeichensatz[0]);
		if(((unreadableHeader || unreadableBody) && !line.includes('8000'))){
			resolve();
		}else{
			unreadableBody == false;
		}
		if(!ldtHelper.verifyLine(line)){
			line = lineAlt;
		}
		if(!ldtHelper.verifyLine(line)){

			con.log(false,">>ERROR: beschädigtes Dokument! ... in Zeile " + lineNumber);
			con.log(true, "++ während des Verarbeitungsschritts: " + processState);
			con.log(true,"++ betroffene Zeile: " + line);
			con.log(true, false);

			if(processState == "header"){
				unreadableHeader = true;
				processState = "'warte auf nächsten Header'";
				containerStack = [];
				resolve(true);
			}

			if(processState == "body"){
				unreadableBody = true;
				processState = "'warte auf nächsten Body'";
				ldtHelper.incUnsaveables();
				container = null;
				resolve(true);
			}
		}else{
			einsenderInfo.hasEinsInfoValue(line);
			switchLineOperation(line).then((res)=>{
				if(typeof res == "function"){
					res().then(resolve, reject)
				}else{
					resolve(false);
				}
			}, (res, err)=>{
				con.log(false,">>ERROR:Ein unerwarteter Fehler ist aufgetreten ... in Zeile " + lineNumber);
				reject(res)
			});	
		}
	});
}
function switchLineOperation(line){
	return new Promise((resolve,reject)=>{
		switch(true){

	    	case line.includes('80008220'):
	    		unreadableHeader = false;
	    		unreadableBody = false;
	    		processState = "header";
	    		processName = "L-Header";
	  			resolve();
	  			

	    		break;
			case line.includes('80008230'):
				unreadableHeader = false;
				unreadableBody = false;
				processState = "header";
				processName = "P-Header"; 
				resolve();
	  			
					
				break;
			case line.includes('80008221'):
				processState = "footer";
				processName = "L-Abschluss";
				einsenderInfo.newContainer().then(()=>{
					con.log(false,enrolledQuellkuerzel);
					postResults(container).then(()=>{
						resolve()
					},reject);
					container = null;
					
					
				}, (res)=>{
					con.log(false, res)
					container = null;
					resolve();
				})

				break; 
			case line.includes('80008231'):
				processState = "footer";
				processName = "P-Abschluss";
				einsenderInfo.newContainer().then(()=>{
					postResults(container).then((e)=>{
						resolve(e)
					},reject);
					container = null;
					
					
				}, (res)=>{
					con.log(false, res)
					container = null;
					resolve();
				})


				break;  
			case line.includes('8000'):
				if(unreadableHeader){
					ldtHelper.incUnsaveables();
					resolve();
					break;
				}
				for(code in befundArten){
					if(line.includes(code)){

						if(container != null){
							containerStack.push(container);
						}

						container = ldtHelper.produceContainer();
						container.ldtVersion = ldtVersion;
						container.newLine = line;
						container.befArt = code;
						container.quelle = quelle;

						resolve(setStateBody);
						break;
					}
				}
				break;
			//ldtVersion im Header
			//STATT LINE INCLUDES CHECKSUM(LINE, CODE) HIER!
			case line.includes('9212'):
				if(processState == 'header'){
					splitLine = line.split('9212');
					ldtVersion = splitLine[1];
					resolve();
					break;
				}
			//quellkürzel im Header
			case line.includes('8312'):
				if(processState == 'header'){
					splitLine = line.split('8312');
					quellkuerzel = splitLine[1];
					enrolledQuellkuerzel.push(quellkuerzel);
					con.log(true, "->> Quellkürzel ist: " + quellkuerzel + " ... (Zeile " + lineNumber + ")");
					con.log(true, false, "--------------------------------------------------")
					resolve();

					break;
				}
			default:
				if(processState == 'body' && !(unreadableHeader || unreadableBody)){
					container.newLine = line
					for(code in befundSuche)
					{

						if(ldtHelper.checkSum(line, code) == 1)
						{
							splitLine = line.split(code);
							searchName = befundSuche[code];

							container[searchName] = ldtHelper.getParsedValue(code, splitLine[1]);
						}

						//checkSum ist größer als 1 wenn mehr als eine Iteration benötigt wird um die Prüfsumme zu confirmen
						//-> schließt darauf dass das Prüfwort in der Zelle vorkommt
						else if(ldtHelper.checkSum(line, code) > 1)
						{
							splitLine = line.split(code);
							splitLine.shift();
							
							searchName = befundSuche[code];
							
							container[searchName] = ldtHelper.getParsedValue(code ,splitLine.join(code));
						}
					}
				}
				resolve();
				break;  
	    }
		
	})
}
function postResults(container){
	return new Promise((resolve,reject)=>{
		var quellkuerzel = enrolledQuellkuerzel.shift();
		var zeichensatz = enrolledZeichensatz.shift();
		var stackCopy = containerStack;
		containerStack = [];
		if(container != null){
			stackCopy.push(container);
		}

		if(stackCopy.length == 0){
			return;
		}

		sqlManager.getEinsenderFromDB(quelle, quellkuerzel).then(res => {
			if(res.length == 1){
				var eins = res[0];
			}else{
				process.exit('Für die Kombination '+quelle+'/'+quellkuerzel+' wurden ' + res.length + " Einträge in Mappings gefunden");
			}
			for(i in stackCopy){
				if(stackCopy[i] != null){
					stackCopy[i]['eins'] = eins;
					stackCopy[i]['zeichensatz'] = zeichensatz; 
					ldtHelper.incUsers(eins);
				}
			}
			try{
				const einsInfoResponse = sqlManager.updateEinsenderInformation(einsenderInfo.getNextEinsenderInformationContainer(eins));
				const befundeResponse = sqlManager.updateBefunde(stackCopy);
				Promise.all([einsInfoResponse, befundeResponse]).then(()=>{
					con.log(false,"Container erfolgreich verarbeitet");
					resolve();
				},(e)=>{
					con.log(false, "Container wurde nicht vollständig in die Datenbank überführt.");
					con.log(true, ">>ERROR: " + e)
					resolve()
				})
			}catch(e){
				reject(e);
			}
		});
	});
}

function setStateHeader(){
	return new Promise((resolve, reject)=>{
			processState = "header";
			unreadableHeader = false;
			if(processState == "header"){
				resolve();
			}else{
				reject();
			}
	})
}
function setStateBody(){
	return new Promise((resolve, reject)=>{
			processState = "body";
			unreadableBody = false;
			if(processState == "body"){
				resolve();
			}else{
				reject();
			}
	})
}
function setStateFooter(){
	return new Promise((resolve, reject)=>{
			processState = "footer";
			if(processState == "footer"){
				resolve();
			}else{
				reject();
			}
	})
}
