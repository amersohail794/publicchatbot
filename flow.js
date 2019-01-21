const fs = require('fs'),
logger = require('./winstonlogger')(__filename);

var fetchAllFlows = () => {
  try {
    var intentsFlow = fs.readFileSync('intent_flow.json');
    return JSON.parse(intentsFlow);
  } catch (e) {
    return [];
  }
};

var findFlow = (intent) =>{
    logger.debug("Finding intent ",intent);
    return new Promise((resolve,reject) =>{
        var flow = fetchAllFlows();
        var intentFlow;
        flow.forEach((flowRow) => {
            let matched = intent.match(new RegExp(flowRow.intent)); //matching regular expression based intent
            if (matched){
                intentFlow = flowRow;    
            }
            // if (flowRow.intent === intent){
            //     intentFlow = flowRow;
                
            // }
        })
        logger.debug("found flow ",intentFlow);
        resolve(intentFlow);
    });

   
}


module.exports.fetchAllFlows = fetchAllFlows;
module.exports.findFlow = findFlow;

