const flow = require('../flow');

var fullIntentFlow = flow.fetchAllFlows();
console.log("Type:",typeof fullIntentFlow);
console.log("IntentFlow Loaded",JSON.stringify(fullIntentFlow,undefined,2));

flow.findFlow('Greeting').then((intentFlow) => {
    console.log("intentFlow Found",JSON.stringify(intentFlow,undefined,2));
});

flow.findFlow('RenewVisa').then((intentFlow) => {
    console.log("intentFlow Found",JSON.stringify(intentFlow,undefined,2));
});