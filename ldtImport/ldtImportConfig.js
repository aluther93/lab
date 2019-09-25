const utf8 = require('utf8');
module.exports = {
	sql: {host:'localhost',user:'alex22', password:'donnerdaumen93', database:'labor'},
	sqlTemplate:{quelle:null,eins:null,labornr:null,aeDatum:null,status:'bereit',befArt:null,befTyp:null,orgid:null,vorsatz:null,name:null,zeichensatz:null,vorname:null,gebTag:null,ldtVersion:null,zeit:'GETDATE()',content:null}, 
	sqlPrimKey:{quelle:null,eins:null,labornr:null,aeDatum:null, zeit:null},

	// 4er Zeichenfolge die in keinem ldt auftaucht
	reservedString: "XXXX", 

	// Sammlung an Attributen die der Container aus dem Befund-Corpus übernimmt.
	//ldtVersion, befArt und content fallen nicht unter diese Suche
	befundDaten: {8311:'labornr',8301:'aeDatum',8401:'befTyp',8310:'orgid',3100:'vorsatz',3101:'name',3102:'vorname',3103:'gebTag'},
	befundArten:{8201:'Labor-Bericht',8202:'LG-Bericht',8203:'Mikrobiologie-Bericht',8204:'Labor-Bericht-Sonstige',8218:'elektronische-Überweisung',8219:'Auftrag-Laborgemeinschaft'},
	parseRules:{8301:parseLineToDate, 3103:parseLineToDate},
	zeitStempel:zeitStempel
}

// PARSE FUNKTIONEN
function parseLineToDate(line){
	var year = line.substring(4,8);
	var month = line.substring(2,4);
	var day = line.substring(0,2);

	return year + month + day;
}
function zeitStempel(){
	var date = new Date();
	var timeZoneDate = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
	var stringFormat = timeZoneDate.toISOString();
	stringFormat = stringFormat.replace("T", " ");
	stringFormat = stringFormat.slice(0, 19);
	return stringFormat;
}
