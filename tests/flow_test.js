const flow = require('../flow'),
logger = require('../winstonlogger')(__filename);

var fullIntentFlow = flow.fetchAllFlows();
logger.debug("Type:",typeof fullIntentFlow);
logger.debug("IntentFlow Loaded",JSON.stringify(fullIntentFlow,undefined,2));

flow.findFlow('Greeting').then((intentFlow) => {
    logger.debug("intentFlow Found",JSON.stringify(intentFlow,undefined,2));
});

flow.findFlow('RenewVisa').then((intentFlow) => {
    logger.debug("intentFlow Found",JSON.stringify(intentFlow,undefined,2));
});