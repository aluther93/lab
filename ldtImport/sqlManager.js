const con = require('./consoleLogging');
let mysql = require('mysql');
let importHelper = require('./ldtImportHelper');
let rootconfig = require('../rootconfig')
var knex = require("knex")({
  client: "mysql",
  debugging:false,
  connection: rootconfig.sql
});


module.exports = {
	getEinsenderFromDB:getEinsenderFromDB,
	disconnect:disconnect,
	updateEinsenderInformation:updateEinsenderInformation,
	updateBefunde:updateBefunde,
	handleToDo:handleToDo
}

var openQueries = 0;
var closingCall = false;
var toDo = [];

function queryDone(){
	openQueries--;
	if(closingCall && openQueries == 0){
		disconnect();
	}
}
function beginQuery(){
	return new Promise((resolve,reject)=>{

		openQueries++;
		knex.raw('select 1+1 as result').then(()=>{
			resolve();
		},()=>{
			closingCall = false;
			var knex = require("knex")({
			  client: "mysql",
			  debugging:false,
			  connection: rootconfig.sql
			});
			resolve();
		});
	})
}
function disconnect(){
	if(openQueries > 0){
		closingCall == true;
	}else{
		knex.destroy();
	}
}
function getEinsenderFromDB(quelle, quellkuerzel){
	return new Promise((resolve,reject)=>{
		beginQuery().then(()=>{

			knex('mappings')
				.where({'quelle': quelle, 'quellkuerzel':quellkuerzel})
				.pluck('eins')
				.catch((e)=>{
					process.exit(e)
				})
				.then(rows => {
					queryDone()
					resolve(rows);
				},(e)=>{
					queryDone()
					reject(e)
				})

		},reject)
	});
}
function updateEinsenderInformation(einsInfo){
	return new Promise((resolve,reject)=>{
	beginQuery().then(()=>{
		knex('einsenderoutput')
			.where({'einsender': einsInfo['eins']})
			.then(res=> {
				if(res.length == 0){
					knex('einsenderoutput')
						.insert({'einsender': einsInfo['eins']})
						.then(resolve,reject)
				}else{
					resolve();
				}
			})
	})
	beginQuery().then(()=>{
		knex('einsender')
			.where({'eins' : einsInfo['eins'], 'quelle' : einsInfo['quelle']})
			.then(res => {
				queryDone()
				if(res.length == 0){
					console.log(einsInfo);
					knex('einsender')
						.insert(einsInfo)
						.then((e)=>{
							queryDone();
							resolve(e);
						}, (e)=>{
							queryDone()
							reject(e);
						})
				}else{
					delete einsInfo['zeichensatz'] // Zeichensatz soll nach INitialisierung niemals geändert werden
					knex('einsender')
						.where({'eins' : einsInfo['eins']})
						.update(einsInfo)
						.then((e)=>{
							queryDone();
							resolve(e);
						},(e)=>{
							queryDone();
							reject(e);
						})
				}
			},reject)
		},reject)
	})
}
function updateBefunde(containerStack){
	return new Promise((resolve,reject)=>{
		sperreBefunde(containerStack).then((e)=>{
			
			//Resolve kann Objekte enthalten die gegebenenfalls aus dem Containerstack entfernt werden müssen.
			for(var k in e){
				if(typeof e[k] == 'object'){
					var labNrToDelete = e[k]['labornr']
					for(var l in containerStack){
						if(containerStack[l]['labornr'] == labNrToDelete && containerStack[l]['befTyp'] == e[k]['befTyp'] ){
							con.log(0,"Befund mit Labornummer: " + labNrToDelete + " ist vom Typ " + e[k]['befTyp'] + " und wird nicht in Datenbank übernommen. (Endbefund liegt bereits vor)")
							delete containerStack[l];
							l = l - 1
						}
					}
				}
			}

			insertBefunde(containerStack).then(()=>{
				for(i in containerStack){
					importHelper.incTotalPaketsRead();
				}
				resolve();
			},reject);
		},reject);
	});
}
function sperreBefunde(containerStack){
	return new Promise((resolve,reject)=>{
		beginQuery().then(()=>{
			var promiseArray = [];
			for(var i in containerStack){
				var container = containerStack[i];
				var type = container['befTyp']//Befundtyp "V", "E" oder "N"
				var sperrBedingung = {
					'quelle': container['quelle'],
					'eins': container['eins'],
					'labornr':container['labornr'],
					'aeDatum' : container['aeDatum'],
					'status' : 'bereit'
				}

				// Handling für Vorbefunde
				if(type == 'V'){
					sperrBedingung['befTyp'] = 'V'
					promiseArray.push(knex('befunde').where(sperrBedingung).update({'status':'gesperrt'}).then(()=>{return "Yo"},()=>{return "No"}))
					
					// Falls es schon einen Endbefund gib, erscheint im Resolve ein Objekt welches nicht eingefügt werden soll
					sperrBedingung['befTyp'] = 'E'
					promiseArray.push(knex('befunde').where(sperrBedingung).then((rows)=>{
						if(rows.length > 0){
							return {"labornr":rows[0]['labornr'], "befTyp": 'V'};
						}
					},()=>{return "ERROR"}));
				}

				//Handling für Endbefunde
				if(type == 'E'){
					sperrBedingung['befTyp'] = 'V';
					promiseArray.push(knex('befunde').where(sperrBedingung).update({'status':'gesperrt'}))
					sperrBedingung['befTyp'] = 'E';
					promiseArray.push(knex('befunde').where(sperrBedingung).update({'status':'gesperrt'}))
				}
			}
			Promise.all(promiseArray).then((e)=>{
							queryDone();
							resolve(e);
						},(e)=>{
							queryDone();
							reject(e);
						});
		},reject)
	});
}
function insertBefunde(containerStack){
	return new Promise((resolve,reject)=>{
		beginQuery().then(()=>{
			var promiseArray = [];
			for(var i in containerStack){
				var container = containerStack[i];
				var befundObj = {
					'quelle': container['quelle'],
					'eins': container['eins'],
					'aeDatum' : container['aeDatum'],
					'vorsatz': container['vorsatz'],
					'zeit': knex.fn.now(),
					'orgid': container['orgid'],
					'labornr':container['labornr'],
					'status': 'bereit',
					'befArt':container['befArt'],
					'befTyp':container['befTyp'],
					'name':container['name'],
					'vorname':container['vorname'],
					'gebTag':container['gebTag'],
					'ldtVersion':container['ldtVersion'],
					'content':container['content'].join(',')
				}
				promiseArray.push(knex('befunde').insert(befundObj).catch((e)=>{
					if(e['code'] == 'ER_DUP_ENTRY'){
					
					//bissele reverse sql
					//retrieveObjectFromSqlInsertQuery(e.sql)
						
						var hit = false;
						for(var x in toDo){
							if(toDo[x] == e.sql){
								hit = true;
							}
						} 
						if(!hit){
							toDo.push(e.sql);
						}
						con.log(false, "ACHTUNG: Der Container (Dokument-Zeile:"+container.lineStart+"-"+container.lineEnd+") wurde nicht vollständig in Datenbank übernommen");
						con.log(1,"Neuer Versuch wird mit Abschluss des Befundes eingeleitet.")
					}else{
						importHelper.incUnsaveables();
					}
				}))
			}
			Promise.all(promiseArray).then((e)=>{
							queryDone();
							resolve(e)
						},(e)=>{
							con.log(2, e)
							queryDone();
							reject(e);
						})
		},reject)
	});
}
function handleToDo(){
	return new Promise((resolve,reject)=>{
		if(toDo.length == 0){
			resolve();
		}else{
			var toDoCopy = toDo;
			toDo = [];
			// Statt UpdateBefunde ForceUpdate (bzw ein tatsächliches update statt insert ) oder Replace ...
			beginQuery().then(()=>{
			var promiseArray = [];
			for(var i in toDoCopy){
				var query = toDoCopy[i];
			    var newTS = 'TIMESTAMPADD(SECOND, 1, CURRENT_TIMESTAMP)';
			    query = query.replace('CURRENT_TIMESTAMP', newTS);
				promiseArray.push(knex.raw(query).catch((e)=>{
					con.log(2," Befund von Zeile: "+container.lineStart+'-'+container.lineEnd+' wurde mit ErrorCode '+e['code']+' nicht in die Datenbank überführt.')
					importHelper.incUnsaveables();
					importHelper.decTotalPaketsRead();
				}))
			}
			Promise.all(promiseArray).then((e)=>{
							queryDone();
							resolve(e)
						},(e)=>{
							queryDone();
							reject(e);
						})
			},reject)
		}
	});
}