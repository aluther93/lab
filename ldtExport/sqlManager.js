let rootconfig = require('../rootconfig')
var knex = require("knex")({
  client: "mysql",
  debugging:true,
  connection: rootconfig.sql
});
module.exports = {
	markBefundeAsAbgerufen:markBefundeAsAbgerufen,
	disconnect:disconnect,
	insertAbgerufeneBefunde:insertAbgerufeneBefunde,
	getBefunde:getBefunde,
	selectAbgerufeneBefunde:selectAbgerufeneBefunde,
	selectEinsenderInfo:selectEinsenderInfo
}
function markBefundeAsAbgerufen(eins){
	return new Promise((resolve,reject)=>{
		knex('befunde')
			.where({
				'eins':`${eins}`,
				'status':'bereit'
			})
			.update({'status':'abgerufen'})
			.then(resolve,reject);
	});
}
function disconnect(){
	knex.destroy();
}
function insertAbgerufeneBefunde(einsender, row){
	return new Promise((resolve,reject)=>{
		knex('abgerufeneBefunde')
			.insert({
				'eins':einsender,
				'labornr':row['labornr'],
				'abgerufenAt':knex.fn.now(),
				'abgerufenFrom':'notYetImplemented',
				'ldtVersion':row['ldtVersion'],
				'zeichensatz':row['zeichensatz'],
				'content':row['content'],
				'aeDatum':row['aeDatum']
			})
			.then(resolve,reject);
	});
}
function getBefunde(eins){
	return new Promise((resolve,reject)=>{
		knex('befunde')
			.where({
				'eins': eins,
				'status':'bereit'
			})
			.select('content', 'ldtVersion', 'zeichensatz', 'labornr','aeDatum')
			.then(resolve,reject);
	});
}
function selectAbgerufeneBefunde(eins){
	return new Promise((resolve,reject)=>{
		knex('abgerufeneBefunde')
			.where({
				'eins': eins
			})
			.select(knex.fn.now(),'content', 'ldtVersion', 'zeichensatz', 'labornr', 'abgerufenAt','aeDatum')
			.orderBy('abgerufenAt', 'desc')
			.then((res)=>{
				if(res.length == 0){
					reject(" Es liegen keine abrufbaren Befunde vor.")
				}
				erstelleResult(res).then(resolve,reject)
			},reject);
	});
}
function erstelleResult(rows){
	return new Promise((resolve,reject)=>{
		var resultArray = [];
		var uniqueCollection = [];
		for(i in rows){
			var labornr = rows[i]['labornr'];
			if(!uniqueCollection.includes[labornr]){
				uniqueCollection.push(labornr)
			}else{
				if(i == rows.length - 1){
					resolve(resultArray);
				}
				break;
			}
			var end = rows[i]['CURRENT_TIMESTAMP'];
			var start = rows[i]['abgerufenAt']
			var abstandInMinuten = (end-start)/1000/60;
			if(abstandInMinuten <= 5){
				resultArray.push(rows[i]);
			}
			if(i == rows.length - 1){
				resolve(resultArray);
			}
		}
	});
}
function selectEinsenderInfo(eins){
	return new Promise((resolve,reject)=>{
		knex('einsender')
			.where({
				'eins':eins
			})
			.select()
			.then(resolve,reject);
	});
}
//var sql = "SELECT * FROM einsender WHERE eins = '"+einsender+"';"