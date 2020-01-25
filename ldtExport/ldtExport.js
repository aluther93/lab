var con = require('./consoleLogging');
var docBuilder = require('./documentBuilder');
var exportHelper = require('./ldtExportHelper');
var sqlManager = require('./sqlManager');

process.on('exit', exitFunction);
	
var path = null;
var einsender = null;
var quelle = null;
var argArray = process.argv;
var zeichensatz = null;

argArray.shift();
argArray.shift();

for(i in argArray){
	switch(argArray[i].charAt(0)){
		case '.':
			if(path == null){
				path = argArray[i];
				if(path.slice(-1) != '/') path = path + '/'
				docBuilder.setPath(path);
			}else{
				process.exit(">>ERROR: Es wurden mehrere Pfade angegeben")
			}
			break;
		case '-':
			if(argArray[i] == '-v' || argArray[i] == '-verbose'){
				con.setVerbose();
			}
			if(argArray[i] == '-r' || argArray[i] == '-routine'){
				con.setRoutine();
			}
			break;
		default:
			if(einsender == null){
				einsender = argArray[i];
				if(einsender.includes("+")){
					var tempSplitArray = einsender.split("+")
					einsender = tempSplitArray[0];
					quelle = tempSplitArray[1];
				}
			}else{
				process.exit(">>ERROR: Einsender kann nicht eindeutig identifiziert werden.")
			}
			break;
	}
}


//Liste an Funktions-Callbacks wird sequenziell abgearbeitet von mainLoop()
var processChain = [
    docBuilder.getPath,
	getEinsenderInfo,
	getBefunde, 
    getSatzartHeader,
    exportHelper.getDatum,
    packContainer,
    flushStorage,
    sendContainer,
    calculateBlockLength,
    flushStorage,
    findName,
    createFile,
	updateStatusAbgerufen,
	closeSqlConnection
 ];
var loops = 0;
var storage = [];
var container = {};
var body = null;
var header = null;
var footer = null;
var fileName = null;
var befundeCount = 0;
var f8300 = null;
var f0101 = null;
var f8312 = null;

mainLoop();

//Führt sequenziell Callbacks in einer Liste aus und wartet auf das Resolved Promise
//ein Rejected Promise unterbricht den mainLoop()
//Resolve(x) speichert x in einer Liste von args
//Reject(x) gibt die Fehlermeldung x aus
function mainLoop(args){
	if(args) storage.push(args);
	if(typeof processChain[loops] != 'undefined'){
		processChain[loops]().then(mainLoop, (msg)=>{
			process.exit(msg);
		})
		loops = loops + 1;
	}
}
function createFile(){
	return new Promise((resolve,reject)=>{		
		docBuilder.assembleAndCreate(header, body, fileName, zeichensatz).then(()=>{
			con.log(false," FILE wurde erfolgreich ERSTELLT");
			resolve();
		}, reject);
	});
}
function flushStorage(){
	return new Promise((resolve,reject)=>{
		con.log(true," STACK wird zurückgesetzt")
		storage = [];
		resolve();
	});
}
function showStorage(){
	return new Promise((resolve,reject)=>{
		con.log(true, " Temporärer Speicher:")
		con.log(true, storage);
		resolve();
	});
}
function sendContainer(){
	return new Promise((resolve,reject)=>{
		con.log(true," CONTAINER wird gesendet ")
		docBuilder.buildDocHeader(container, String(zeichensatz)).then(resolve, reject);	
	})
}
function packContainer(){
	return new Promise((resolve,reject)=>{
		for(i in storage){
			container = Object.assign(container, storage[i]);
		}
		resolve();	
	})
}
function getBefunde(){
	return new Promise((resolve,reject)=>{
		sqlManager.getBefunde(einsender, quelle).then((res)=>{
			if(res.length == 0){
				squeezeIntoProcessChain(lookFurtherForBefunde).then(resolve,reject);
			}else{
				var promiseArray = [];
				for(i in res){
					befundeCount ++;
					promiseArray.push(sqlManager.insertAbgerufeneBefunde(einsender, res[i]));
					
				}
				Promise.all(promiseArray).then(()=>{
					resolve(processQueryResultBefunde(res))
				},reject);
			}
		}, reject);	
	});
}
function lookFurtherForBefunde(){
	return new Promise((resolve,reject)=>{
		con.log(false, " ! Passende Befunde wurden schon abgerufen ... ");
		sqlManager.selectAbgerufeneBefunde(einsender,quelle).then((res)=>{
			if(res.length == 0){
				reject("> Es liegen keine bereiten Befunde vor.");
			}else{
				res = processQueryResultBefunde(res);
				resolve(res);
			}
		},reject)
	})
}
function updateStatusAbgerufen(){
	return new Promise((resolve,reject)=>{
		sqlManager.markBefundeAsAbgerufen(einsender).then(()=>{
			resolve();
		},reject);
	});	
}
function getEinsenderInfo(){
	return new Promise((resolve,reject)=>{
		sqlManager.selectEinsenderInfo(einsender, quelle).then((res)=>{
			if(typeof res[0] != 'undefined'){
				zeichensatz = res[0]['zeichensatz'];
				docBuilder.setHeaderBlueprintException('8300', res[0]['f8300']);
				docBuilder.setHeaderBlueprintException('8312', res[0]['f8312']);
				docBuilder.setHeaderBlueprintException('0101', res[0]['f0101']);
				resolve(res[0]);
			}else{
				reject(">>>ERROR: Es konnte kein Einsender gefunden werden ");
			} 

		}, reject);
	});
}

function getSatzartHeader(){
	return new Promise((resolve, reject)=>{
		con.log(true," SATZART wird festgelegt // Hardcoded as '8220'")
		resolve({'satzart':'8220'});
	});
}
function processQueryResultBefunde(rows){
	var processedResult = {
		'content': [],
		'ldtVersion': null,
		'zeichensatz': null
	};
	var primeTupels = [];
	var tupel = null;
	var presentFlag = false;
	//Hier werden Rows aussortiert, die identisch mit anderen sind aber früher abgerufen wurden.
	//ROWS sind geordnet nach ihrem Abrufzeitpunkt (am nähsten in Vergangenheit zuerst)
	if(typeof rows[0]['abgerufenAt'] != 'undefined'){
		var rowsCopy = rows
		rows = [];
		for(i in rowsCopy){
			tupel = {
				x:rowsCopy[i]['labornr'],
				y:rowsCopy[i]['aeDatum']
			}
			for(j in primeTupels){

				var x1 = primeTupels[j]['x'];
				var x2 = tupel['x'];
				var y1 = primeTupels[j]['y'].toString();
				var y2 =  tupel['y'].toString();
				
				if(x1 == x2 && y1 == y2){
					presentFlag = true;
				}
			}
			if(!presentFlag){
				befundeCount = befundeCount + 1;
				primeTupels.push(tupel);
				rows.push(rowsCopy[i]);
			}else{
				presentFlag = false;
			}
		}
	}

	for(i in rows){
		for(type in rows[i]){
			switch(true){
				case type == 'labornr':
					break;
				case type == 'content':
					processedResult['content'].push(rows[i]['content']);
					break;
				default:
					if(processedResult[type] != null && processedResult[type] != rows[i][type]){
						con.log(false," UNHANDLED EVENT: " + type + " der Befunde unterscheidet sich!");
						break;
					}else{
						processedResult[type] = String(rows[i][type]);
						break;
					}
			}
		}
	}
	body = contentTransformation(processedResult['content']);
	return processedResult;
}
function contentTransformation(content){
	content = content.join(',');
	content = content.split(',');
	content = exportHelper.condenseLines(content);
	
	var finalProduct = [];
	exportHelper.isBodyConsistent(content).then((typeSafeBody)=>{
		for(i in typeSafeBody){
			if(typeSafeBody[i] != null){
				finalProduct.push(typeSafeBody[i] + docBuilder.stop());
			}
		}
	}, process.exit);
	return finalProduct; 
}
function calculateBlockLength(){
	return new Promise((resolve, reject)=>{
		var firstEntry = storage[0];
		for(i in firstEntry){
			if(exportHelper.isTypeCallback(firstEntry[i])){
				//FÜHRT CALLBACK AUS UND BELEGT DEN PLATZ IM ARRAY MIT DEM ERGEBNIS
				firstEntry[i] = firstEntry[i](firstEntry);
				con.log(true," BLOCKLÄNGE wurde berechnet");
				header = firstEntry;
				resolve();
			}
		}
		reject(">>>ES KONNTE KEINE BLOCKLÄNGE BERECHNET WERDEN!");
	});
}
function buildFooter(){
	return new Promise((resolve, reject)=>{
		var returnValue = [];
		var satzArt = null;
		var satzLänge = null;
		var packetLänge = null;
		var byteCounterHeader = 0;
		var byteCounterBody = 0;

		satzArt = '01380008221' + docBuilder.stop();
		returnValue.push(satzArt);

		for(var i in header){
			byteCounterHeader = byteCounterHeader + exportHelper.readByteLength(header[i]);
		}
		for(var j in body){
			byteCounterBody = byteCounterBody + exportHelper.readByteLength(body[j]);
		}

		var bytesToEncodePacketLänge = parseInt(String(byteCounterHeader + byteCounterBody).length) + 1;
		var packetLängeInBytes = 7 + bytesToEncodePacketLänge + 2;
		var bytesToEncodeSatzLänge = parseInt(String(packetLängeInBytes + 13).length) + 1;
		var satzLängeInBytes = 7 + bytesToEncodeSatzLänge + 2;
		var satzLängeFeldWert = satzLängeInBytes + packetLängeInBytes + exportHelper.readByteLength(satzArt);

		satzLänge = String(satzLängeInBytes).padStart(3, '0') + '8100' + String(satzLängeFeldWert).padStart(bytesToEncodeSatzLänge, '0') + docBuilder.stop();
		returnValue.push(satzLänge);

		packetLänge = String(packetLängeInBytes).padStart(3, '0') + '9202' + String(byteCounterHeader + byteCounterBody + satzLängeFeldWert).padStart(bytesToEncodePacketLänge, '0') + docBuilder.stop();
		returnValue.push(packetLänge);
		footer = returnValue;
		resolve();
	});
}
function findName(){
	return new Promise((resolve,reject)=>{
		docBuilder.generateFileName().then((find)=>{
			if(!find){
				con.log(2," ACHTUNG: KOLLISION bei Namensvergabe ... Erneuter Versuch")
				squeezeIntoProcessChain(findName).then(resolve, reject);
			}else{
				fileName = find;
				resolve()
			}
		}, reject);
	});
}
function squeezeIntoProcessChain(cb){
	return new Promise((resolve,reject)=>{
		processChain.splice(loops, 0 , cb);
		resolve();
	});
}
function exitFunction(msg){
	if(!msg)
	{
		var assembledString = befundeCount;
		if(befundeCount == 1){
			assembledString = assembledString + " Befund";
		}else{
			assembledString = assembledString + " Befunde";
		}
		con.log(false, false, "");
		con.log(false,"> "+assembledString+" wurde exportiert.");
		con.log(2,"> "+ fileName);
	}
	else
	{
		
		con.log(2,msg);
	}
}
function closeSqlConnection(){
	return new Promise((resolve,reject)=>{
		sqlManager.disconnect();
		resolve();
	});
}