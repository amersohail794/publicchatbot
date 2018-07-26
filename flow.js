const fs = require('fs');

var fetchAllFlows = () => {
  try {
    var intentsFlow = fs.readFileSync('intent_flow.json');
    return JSON.parse(intentsFlow);
  } catch (e) {
    return [];
  }
};

var findFlow = (intent) =>{
    console.log("Finding intent ",intent);
    return new Promise((resolve,reject) =>{
        var flow = fetchAllFlows();
        var intentFlow;
        flow.forEach((flowRow) => {
            if (flowRow.intent === intent){
                intentFlow = flowRow;
                
            }
        })
        console.log("found flow ",intentFlow);
        resolve(intentFlow);
    });

   
}


module.exports.fetchAllFlows = fetchAllFlows;
module.exports.findFlow = findFlow;

