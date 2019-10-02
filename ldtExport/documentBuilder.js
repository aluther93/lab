module.exports = {
	buildDocHeader:buildDocHeader,
	getBytesNeeded:getBytesNeeded,
	stop:stop,
	getPath:getPath,
	assembleAndCreate:assembleAndCreate,
	generateFileName:generateFileName,
	setPath:setPath
}
var config = require('./ldtExportConfig');
let fs = require('fs');
let con = require('./consoleLogging');
var ctt = require('./codeTableTranslator');

var finalFileName = null;
var path = null;
var documentArr = [];
var zwingendErforderlich = {
	'8000':'satzart',
	'8100':'satzlänge',
	'9212':'ldtVersion',
	'0201':'bsnr1',
	'0203':'bsnr2',
	'0205':'strasse',
	'0216':'ort',
	'0215':'plz',
	'0101':'kbv',
	'9106':'zeichensatz',
	'8312':'kundenNr',
	'9103':'datum'
};
var zeichensatzIdent = 0;
function buildDocHeader(arr){
	return new Promise((resolve,reject)=>{
		var counter = 0;
		for(i in zwingendErforderlich){
			var satz = '';
			var wort = zwingendErforderlich[i];
			if(typeof arr[wort] != 'undefined'){
				if(wort == 'zeichensatz') zeichensatzIdent = arr[wort];
				satz = String(i) + String(arr[wort]); 
				documentArr[counter] = getBytesNeeded(satz) + satz + stop();
			}
			if(wort == 'satzlänge'){
				documentArr[counter] = bestimmeBlockLänge;
			} 
			counter++;
		}
		resolve(documentArr);
	});	
}
function setPath(value){
	path = value;
}

function istFeldkennzeichnung(line, fk){
	var length = line.substring(0,3);
	var splitLine = line.split(fk);
	return splitLine[0] == length;

}
function stop(){
	return String.fromCharCode(13,10);
}
function getBytesNeeded(line){
	return String(line.length + 5).padStart(3, '0')
}
function bestimmeBlockLänge(arr){
	var byteCount = 0;
	var satz1 = null;
	var satz2 = null;
	var satz3 = null;
	for(i in arr){
		if(typeof arr[i] == 'string'){
			byteCount = byteCount + parseInt(arr[i].substring(0, 3));
		}
	}

	satz1 = '8100' + String(byteCount);
	var satzLänge = parseInt(getBytesNeeded(satz1));
	satz2 = '8100' + String(byteCount + satzLänge);
	if(getBytesNeeded(satz1) != getBytesNeeded(satz2)){
		satz3 = '8100' + String(byteCount + parseInt(getBytesNeeded(satz2)));
		return getBytesNeeded(satz3) + satz3 + stop();
	}

	return getBytesNeeded(satz2) + satz2 + stop();
}
function getPath(){
	return new Promise((resolve,reject)=>{
		if(path == null){
			path = config.exportPath;
		}
		isValidPath(path).then(resolve,reject);
	});
}
function returnFalse(){
	return false;
}
function assembleAndCreate(header, body, footer, fn, zs){
	return new Promise((resolve,reject)=>{


		var fullDocString = header.join('') + body.join('') + footer.join('');
		ctt.parseText(fullDocString, zs).then((buff)=>{
			fs.writeFile(fn, buff,(err)=>{
				if(!err){
					resolve();
				}
				reject(">>> ERROR: FILE konnte nicht erstellt werden");
			});
		},reject)


		//------------------------------------------------------------------
		var ibmSetstring = "P,`,p,á,!,1,A,Q,a,q,ß,2,2,B,R,b,r,é,3,3,#,3,C,S,c,s,â,4,4,$,4,D,T,d,t,ä,ö,5,5,§,%,5,E,U,e,u,à,6,6,&,6,F,V,f,v,μ,7,7,',7,G,W,g,w,ç,8,8,(,8,H,X,h,x,ê,°,9,9,),9,I,Y,i,y,Ö,10,A,*,:,J,Z,j,z,è,Ü,11,B,+,;,K,[,k,½,12,C,<,L,l,13,D,-,=,M,],m,14,E,.,>,N,^,n,Ä,15,F,/,?,O,o"
		var iso88591SetString = "0,0,0,@,P,`,p,°,à,1,1,!,1,A,Q,a,q,¡,Ñ,á,ñ,2,2,2,B,R,b,r,â,ò,3,3,#,3,C,S,c,s,ó,4,4,$,4,D,T,d,t,Ä,ä,ô,5,5,%,5,E,U,e,u,μ,Å,å,6,6,&,6,F,V,f,v,Æ,Ö,æ,ö,7,7,',7,G,W,g,w,§,Ç,ç,8,8,(,8,H,X,h,x,è,9,9,),9,I,Y,i,y,É,é,ù,10,A,LF,*,:,J,Z,j,z,º,ê,ú,11,B,+,;,K,[,k,ë,û,12,C,,,<,L,l,Ü,ì,ü,13,D,-,=,M,],m,½,í,14,E,.,>,N,^,n,î,15,F,/,?,O,_,o,ß,ï,"
		var iso885015SetString = "0,0,0,@,P,`,p,°,À,Ð,à,ð,1,1,!,1,A,Q,a,q,¡,±,Á,Ñ,á,ñ,2,2,2,B,R,b,r,¢,²,Â,Ò,â,ò,3,3,#,3,C,S,c,s,£,³,Ã,Ó,ã,ó,4,4,$,4,D,T,d,t,€,Ž,Ä,Ô,ä,ô,5,5,%,5,E,U,e,u,¥,μ,Å,Õ,å,õ,6,6,&,6,F,V,f,v,Š,¶,Æ,Ö,æ,ö,7,7,',7,G,W,g,w,§,·,Ç,×,ç,÷,8,8,(,8,H,X,h,x,š,ž,È,Ø,è,ø,9,9,),9,I,Y,i,y,©,¹,É,Ù,é,ù,10,A,*,:,J,Z,j,z,ª,º,Ê,Ú,ê,ú,11,B,+,;,K,[,k,{,«,»,Ë,Û,ë,û,12,C,,,<,L,\,l,|,¬,OE,Ì,Ü,ì,ü,13,D,CR,-,=,M,],m,},oe,Í,Ý,í,ý,14,E,.,>,N,^,n,~,®,Ÿ,Î,Þ,î,þ,15,F,/,?,O,_,o,¯,¿,Ï,ß,ï"
		
		ctt.parseText(ibmSetstring, 2).then((buff)=>{
			fs.writeFile("./ibmBeweis", buff,()=>{
				console.log("IBM File wurde erstellt");
			},reject)
		},()=>{
			console.log("IBM File konnte nicht erstellt werden");
		})
		ctt.parseText(iso88591SetString, 3).then((buff)=>{
			fs.writeFile("./Iso8851-1", buff,()=>{
				console.log("ISO8851 File wurde erstellt");
			},reject)
		},()=>{
			console.log("ISO8851 File konnte nicht erstellt werden");
		})
		ctt.parseText(iso885015SetString, 4).then((buff)=>{
			fs.writeFile("./Iso8859-15", buff,()=>{
				console.log("Iso8859-15 File wurde erstellt");
			},reject)
		},()=>{
			console.log("Iso8859-15 File konnte nicht erstellt werden");
		})
		//------------------------------------------------------------------

	});
}
function isValidPath(x){
	return new Promise((resolve,reject)=>{
		fs.access(x, fs.F_OK, (err) => {
		  if (err) {
		  	if(x == process.argv[3]){
		  		process.exit('>>> ERROR: Der angegebene Pfad existiert nicht!');
		  	}
		    process.exit("Der im Config File angegebene Pfad ist nicht gültig!");
		    return
		  }else{
		  	con.log(true," PATH wurde VERIFIZIERT");
		  	con.log(true," PATH ist " + x);
		  	resolve();
		  }
		});
		
	});
}
function generateFileName(){
	return new Promise((resolve,reject)=>{
		var fileName = "";
		switch(zeichensatzIdent){
			case '1':
				fileName = fileName + "S";
				break;
			case '2':
				fileName = fileName + "X";
				break;
			case '3':
				fileName = fileName + "A";
				break;
			case '4':
				fileName = fileName + "Z";
				break;
			default:
				fileName = fileName + "S";
				break;
		}
		fileName = fileName + "01";
		var tempName = fileName + makeid(6) + ".ldt";
		var tempPath = path  + tempName;
		var freeNameSpace = fs.access(tempPath, fs.F_OK, (err)=>{
			if(err){
				if(err.errno == -4058){
					resolve(tempPath);
				}else{
					reject();
				}
			}else{
				resolve(false);
			}
		});
	});
}
function makeid(length) {
   var result           = '';
   var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
   var charactersLength = characters.length;
   for ( var i = 0; i < length; i++ ) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
   }
   return result;
}