module.exports = {
	parseText:parseText
}

var legacy = require('legacy-encoding');


//Text wird von DB als Utf-8 kodiert ausgegeben
// parseText(x,y) -> Buffer
function parseText(docString, zs){
	return new Promise((resolve,reject)=>{
        var bufferFromDB = Buffer.from(docString, "utf8");
        var result= null;
		switch(zs){
			case 1:
				result = legacy.encode(bufferFromDB, 65001);
				break;
			case 2:
                result = legacy.encode(bufferFromDB, 437);
				break;
			case 3:
                result = legacy.encode(bufferFromDB, 28591);
				break;
			case 4:
                result = legacy.encode(bufferFromDB, 28605);
				break;
			default:
				reject(" Die Kodierung wurde nicht erkannt");
				break;
		}
		if(result != null){
			resolve(result);
		}
	})
}