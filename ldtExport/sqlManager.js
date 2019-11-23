let rootconfig = require('../rootconfig')
var con = require('./consoleLogging');
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
				'content':row['content'],
				'aeDatum':row['aeDatum']
			})
			.then(resolve,reject);
	});
}
function getBefunde(eins, quelle){
	return new Promise((resolve,reject)=>{
		if(quelle == null){
			knex('befunde')
				.where({
					'eins': eins,
					'status':'bereit'
				})
				.select('content', 'ldtVersion', 'labornr','aeDatum')
				.then(resolve,reject);
		}else{
			knex('befunde')
				.where({
					'eins': eins,
					'quelle':quelle,
					'status':'bereit'
				})
				.select('content', 'ldtVersion', 'labornr','aeDatum')
				.then(resolve,reject);
		}
	});
}
function selectAbgerufeneBefunde(eins){
	return new Promise((resolve,reject)=>{
		knex('abgerufeneBefunde')
			.where({
				'eins': eins
			})
			.select(knex.fn.now(),'content', 'ldtVersion', 'labornr', 'abgerufenAt','aeDatum')
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
function selectEinsenderInfo(eins, explicitQuelle){
	return new Promise((resolve,reject)=>{
		knex('einsenderoutput')
			.where({'einsender': eins})
			.then(res =>{
				if(res.length == 0){
					reject("Einsender "+eins+" existiert nicht!")
				}
				if(res[0]['zeichensatz'] != null){
					var festgeschriebenerZS = res[0]['zeichensatz'];
					con.log(true, "Der Zeichensatz wurde wegen Standardoutput auf " + festgeschriebenerZS + " gesetzt!");
				}
				if(explicitQuelle != null){
					res[0]['quelle'] = explicitQuelle;
					con.log(true, "Die explizit angegebene Quelle lautet "+explicitQuelle);	
				}
				if(res[0]['quelle'] != null){
					knex('einsender')
						.where({'eins': eins, 'quelle': res[0]['quelle']})
						.select()
						.then(result => {
							// Wenn der Zeichensatz laut Export festgeschrieben ist für den Einsender, aber explizit eine Quelle angegeben wurde -> Verwendung des Zeichensatzes der explizit angegebenen Quelle
							if(typeof festgeschriebenerZS != 'undefined' && explicitQuelle == null){
								result[0]['zeichensatz'] = festgeschriebenerZS;
							}
							resolve(result);
						},(e)=>{
							process.exit(e)
						})
				}else{
					knex('einsender')
						.where({'eins': eins})
						.select()
						.then(result => {
							if(typeof festgeschriebenerZS != 'undefined'){
								result[0]['zeichensatz'] = festgeschriebenerZS;
							}
							resolve(result);
						},reject)
				}
			},reject)
	});
}
//var sql = "SELECT * FROM einsender WHERE eins = '"+einsender+"';"