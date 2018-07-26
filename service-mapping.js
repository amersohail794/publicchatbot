const fs = require('fs');


const fileName = 'service_mapping.json';

var loadAllMappings = () => {
  try {
    var serviceMappings = fs.readFileSync(fileName);
    return JSON.parse(serviceMappings);
  } catch (e) {
    return [];
  }
};


module.exports.loadAllMappings = loadAllMappings;