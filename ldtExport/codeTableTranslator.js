module.exports = {
	parseTextArray:parseTextArray
}

var cptable = require('codepage');
var utf8 = require('utf8');
var con = require('./consoleLogging');

//Text wird von DB als Utf-8 kodiert ausgegeben
function parseTextArray(textArrayUtf8, zs){
	return new Promise((resolve,reject)=>{
		var arr = [];
		for(i in textArrayUtf8){
			var buffer = cptable.utils.encode(65001, textArrayUtf8[i]);
			arr.push(makeCompatibleHex(buffer));
		}
		Promise.all(arr).then((res)=>{
			var resultArray = [];
			for(i in res){
				switch(zs){
					case 1:
						resultArray[i] = cptable.utils.decode(65001, res[i]);
						break;
					case 2:
						resultArray[i] = cptable.utils.decode(437, res[i]);
						break;
					case 3:
						resultArray[i] = cptable.utils.decode(28591, res[i]);
						break;
					case 4:
						resultArray[i] = cptable.utils.decode(28605, res[i]);
						break;
					default:
						resultArray[i] = cptable.utils.decode(65001, res[i]);
						break;
				}
				if(i == res.length - 1){
					resolve(resultArray);
				}
			}
		},reject);
	})
}
function makeCompatibleHex(buffer){
	return new Promise((resolve,reject)=>{
		var hex = buffer.toString('hex');
		var hexArray = hex.match(/../g);
		for(i in hexArray){
			hexArray[i] = Number('0x'+hexArray[i]);
			if(i == hexArray.length - 1){
				resolve(hexArray)
			}
		}
	});
}