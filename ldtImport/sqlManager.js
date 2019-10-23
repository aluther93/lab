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
	updateBefunde:updateBefunde
}

function getEinsenderFromDB(quelle, quellkuerzel){
	return new Promise((resolve,reject)=>{
		knex('mappings')
			.where({'quelle': quelle, 'quellkuerzel':quellkuerzel})
			.pluck('eins')
			.catch((e)=>{
				process.exit(e)
			})
			.then(rows => {
				resolve(rows);
			},(e)=>{
				reject(e)
			})
	});
}
function disconnect(){
	knex.destroy();
}
function updateEinsenderInformation(einsInfo){
	return new Promise((resolve,reject)=>{
	knex('einsender')
		.where({'eins' : einsInfo['eins']})
		.then(res => {
			if(res.length == 0){
				knex('einsender')
					.insert(einsInfo)
					.then(resolve, reject)
			}else{
				delete einsInfo['zeichensatz'] // Zeichensatz soll nach INitialisierung niemals geändert werden
				knex('einsender')
					.where({'eins' : einsInfo['eins']})
					.update(einsInfo)
					.then(resolve,reject)
			}
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
		Promise.all(promiseArray).then(resolve,reject);
	});
}
function insertBefunde(containerStack){
	return new Promise((resolve,reject)=>{
		var promiseArray = [];
		for(i in containerStack){
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
				'zeichensatz':container['zeichensatz'],
				'content':container['content'].join(',')
			}
			promiseArray.push(knex('befunde').insert(befundObj).catch((e)=>{
				if(e['code'] == 'ER_DUP_ENTRY'){
					con.log(false, " ACHTUNG: In der gelesenen Datei befinden sich Befunde mit mehrfach vergebenem Identifier. Nur einer der Befunde wird in die Datenbank übernommen.");
				}else{
					importHelper.incUnsaveables();
				}
				importHelper.decTotalPaketsRead();
			}))
		}
		Promise.all(promiseArray).then(resolve,reject)
	});
}