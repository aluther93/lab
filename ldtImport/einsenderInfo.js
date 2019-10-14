
module.exports = {
	hasEinsInfoValue:hasEinsInfoValue,
	newContainer:newContainer,
	getNextEinsenderInformationContainer:getNextEinsenderInformationContainer
}
var einsInfo = {
	'0201':null,
	'0203':null,
	'0205':null,
	'0215':null,
	'0216':null,
	'0101':null,
	'8312':null,
	'9106':null
}
var einsInfoStack = [];

function newContainer(){
	return new Promise((resolve,reject)=>{
		var n0 = einsInfoStack.length;
		einsInfoStack.push(einsInfo);
		einsInfo = {
			'0201':null,
			'0203':null,
			'0205':null,
			'0215':null,
			'0216':null,
			'0101':null,
			'8312':null,
			'9106':null
		}
		if(n0 < einsInfoStack.length){
			resolve();
		}else{
			reject("Die Einsender-Informationen konnten nicht zur Verarbeitung freigegeben werden.");
		}
	});
}
function hasEinsInfoValue(line){
	for(code in einsInfo)
	{
		if(line.includes(code)){
			if(verifyLine(line) && istFeldkennzeichnung(line, code)){
				temp = line.split(code);
				einsInfo[code] = temp[1];
			}
		}
	}
}
function verifyLine(line){
	return (line.length + 2) == parseInt(line.substring(0,3));
}
function istFeldkennzeichnung(line, fk){
	var length = line.substring(0,3);
	var splitLine = line.split(fk);
	return splitLine[0] == length;
}
function getNextEinsenderInformationContainer(eins){
	//Der 4-stellige Zahlencode wird durch den ColumnName in der SQL Tabelle ersetzt
	var refinedInformation = {'eins' : eins};
	var informationSheet = einsInfoStack.shift();
	var mappings = {
		'0201':'bsnr1',
		'0203':'bsnr2',
		'0205':'strasse',
		'0215':'plz',
		'0216':'ort',
		'0101':'kbv',
		'8312':'kundenNr',
		'9106':'zeichensatz'
	}
	for(i in mappings){
		refinedInformation[mappings[i]] = informationSheet[i]
	}
	return refinedInformation;
}