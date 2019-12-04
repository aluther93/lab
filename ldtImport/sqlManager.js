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
		sperreBefunde(containerStack).then(()=>{
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
			for(i in containerStack){
				var container = containerStack[i];
				var sperrBedingung = {
					'quelle': container['quelle'],
					'eins': container['eins'],
					'labornr':container['labornr'],
					'aeDatum' : container['aeDatum'],
					'status' : 'bereit'
				}
				promiseArray.push(knex('befunde').where(sperrBedingung).update({'status':'gesperrt'}))
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
						
						var hit = false;
						for(var x in toDo){
							if(toDo[x] == container){
								toDo[x] = container;
								hit = true;
							}
						} 
						if(!hit){
							toDo.push(container);
						}
						con.log(false, "ACHTUNG: Der Container (Dokument-Zeile:"+container.lineStart+"-"+container.lineEnd+") mit der Labornr:"+container['labornr']+" und dem Befundtyp:"+container['befTyp']+" kann nicht in die Datenbank überführt werden.");
					}else{
						importHelper.incUnsaveables();
					}
					importHelper.decTotalPaketsRead();
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
				var container = toDoCopy[i];
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
			    var query = knex('befunde').insert(befundObj).toString()
			    var newTS = 'TIMESTAMPADD(MINUTE, 1, CURRENT_TIMESTAMP)';
			    query = query.replace('CURRENT_TIMESTAMP', newTS);
				promiseArray.push(knex.raw(query).catch((e)=>{
					con.log(2," Befund von Zeile: "+container.lineStart+'-'+container.lineEnd+' wurde mit ErrorCode '+e['code']+' nicht in die Datenbak überführt.')
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