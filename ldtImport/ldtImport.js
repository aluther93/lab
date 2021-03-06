
const ldtHelper = require('./ldtImportHelper');
const sqlManager = require('./sqlManager');
const einsenderInfo = require('./einsenderInfo');
const con = require('./consoleLogging');
var readline = require('readline');
var ctt = require('./codeTableTranslator');
const { program } = require('commander');

process.on('exit', ldtHelper.exitFunction);

program
	.option('-q, --quelle <value>', 'Quelle der LDT-Datei')
	.option('-r, --routine', 'Minimaler Consolenoutput')
	.option('-v, --verbose','Ausführlicher Consolenoutput (Debugging)')
	.parse(process.argv);

if(program.quelle){
	var quelle = program.quelle;
}else{
	process.exit(">> ERROR: Es wurde keine Quelle angegeben.");
}
if(program.routine) con.setRoutine();
if(program.verbose) con.setVerbose();

var quellkuerzel;
var readArray = [];
var i = 0;
var bool = true;
var processName = 'bereit';
var processState = "inactive";
var container = null;
var ldtVersion;
var befundSuche = {8311:'labornr',8301:'aeDatum',8401:'befTyp',8310:'orgid',3100:'vorsatz',3101:'name',3102:'vorname',3103:'gebTag'};
var befundArten = {8201:'Labor-Bericht',8202:'LG-Bericht',8203:'Mikrobiologie-Bericht',8204:'Labor-Bericht-Sonstige',8218:'elektronische-Überweisung',8219:'Auftrag-Laborgemeinschaft'};
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

einsenderInfo.setQuelle(quelle);


rl.on('line', (line)=>{
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
		terminateProcess();
	}
}
function terminateProcess(){
	if(!running){
		con.log(true,"ACHTUNG: Disconnect from DB!")
		sqlManager.disconnect();
	}
}
//Resolve ist TRUE wenn eine Flagge weiteres Lesen einschränken soll
function verifyAndHandleLine(lineToCheck){
	return new Promise((resolve,reject)=>{
		var line = ctt.lineToUtf8(lineToCheck, enrolledZeichensatz[0]);
		var lineAlt = ctt.lineToUtf8(lineToCheck);
		if(((unreadableHeader || unreadableBody) && !line.includes('8000'))){
			resolve();
		}else{
			unreadableBody == false;
		}
		if(!ldtHelper.verifyLine(line)){
			line = lineAlt;
		}
		if(!ldtHelper.verifyLine(line)){
			con.log(2,">>ERROR: beschädigtes Dokument! ... in Zeile " + lineNumber);
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
				con.log(2,">>ERROR:Ein unerwarteter Fehler ist aufgetreten ... in Zeile " + lineNumber);
				reject(res)
			});	
		}
	});
}
function switchLineOperation(line){
	return new Promise((resolve,reject)=>{
		switch(true){

	    	case (ldtHelper.checkSum(line, '80008220')==1):
	    		unreadableHeader = false;
	    		unreadableBody = false;
	    		processState = "header";
	    		processName = "L-Header";
	  			resolve();
	  			

	    		break;
			case (ldtHelper.checkSum(line, '80008230')==1):
				unreadableHeader = false;
				unreadableBody = false;
				processState = "header";
				processName = "P-Header"; 
				resolve();
	  			
					
				break;
			case (ldtHelper.checkSum(line, '80008221')==1):
				processState = "footer";
				processName = "L-Abschluss";
				einsenderInfo.newContainer().then(()=>{
					postResults(container).then((e)=>{
						container = null;
						sqlManager.handleToDo().then(()=>{
							resolve(e)
						},reject);
					},reject);
					
					
				}, (res)=>{
					con.log(2, res)
					container = null;
					resolve();
				})

				break; 
			case (ldtHelper.checkSum(line, '80008231')==1):
				processState = "footer";
				processName = "P-Abschluss";
				einsenderInfo.newContainer().then(()=>{
					postResults(container).then((e)=>{
						container = null;
						sqlManager.handleToDo().then(()=>{
							resolve(e)
						},reject);
					},reject);
					
					
				}, (res)=>{
					con.log(2, res)
					container = null;
					resolve();
				})


				break;  
				//break;
			//ldtVersion im Header
			//STATT LINE INCLUDES CHECKSUM(LINE, CODE) HIER!
			case ldtHelper.checkSum(line, '9212')==1:
				if(processState == 'header'){
					splitLine = line.split('9212');
					ldtVersion = splitLine[1];
					resolve();
					break;
				}
			//quellkürzel im Header
			case (ldtHelper.checkSum(line, '8312')==1):
				if(processState == 'header'){
					splitLine = line.split('8312');
					quellkuerzel = splitLine[1];
					enrolledQuellkuerzel.push(quellkuerzel);
					con.log(true, "->> Quellkürzel ist: " + quellkuerzel + " ... (Zeile " + lineNumber + ")");
					con.log(true, false, "--------------------------------------------------")
					resolve();

					break;
				}
			case (ldtHelper.checkSum(line, '8000')==1):
				if(unreadableHeader){
					ldtHelper.incUnsaveables();
					resolve();
					break;
				}
				for(code in befundArten){
					if(line.includes(code)){
						if(container != null){
							container.lineEnd = lineNumber - 1;
							containerStack.push(container);
						}
						container = ldtHelper.produceContainer(lineNumber);
						container.ldtVersion = ldtVersion;
						container.newLine = line;
						container.befArt = code;
						container.quelle = quelle;

						resolve(setStateBody);
						break;
					}
				}
				break;
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
		if(typeof containerStack[0] != 'undefined'){
			var containerStackStartLine = containerStack[0].lineStart;
		}else{
			var containerStackStartLine = container.lineStart;
		}
		containerStack = [];
		if(container != null){
			container.lineEnd = lineNumber - 1;
			stackCopy.push(container);
		}

		if(stackCopy.length == 0){
			return;
		}

		sqlManager.getEinsenderFromDB(quelle, quellkuerzel).then(res => {
			if(res.length == 1){
				var eins = res[0];
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
						con.log(false,"Befundcontainer erfolgreich verarbeitet || Dokumentzeile: "+containerStackStartLine+"-"+container.lineEnd);
						resolve();
					},(e)=>{
						con.log(2, "Container wurde nicht vollständig in die Datenbank überführt.");
						con.log(2, ">>ERROR: " + e)
						resolve()
					})
				}catch(e){
					reject(e);
				}
			}else{
				con.log(2, 'Für die Kombination '+quelle+'/'+quellkuerzel+' wurden ' + res.length + ' Einträge in Mappings gefunden');
				ldtHelper.incUnsaveables();
				resolve();
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

