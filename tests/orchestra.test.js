const orchestra = require('../orchestra');

var data = orchestra.retrieveData('BRANCHES',new Map(Object.entries({SERVICE_ID:'7',LATITUDE:'25.077265790923',LONGITUDE: '55.150239192244'})),'get');

console.log("Response -> " + JSON.stringify(data,undefined,2));