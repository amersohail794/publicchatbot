// import { setTimeout } from 'timers';

const
  https = require('https'),
  request = require('request'),
  axios = require('axios'),
  flow = require('./flow'),
  luis = require('./luis'),
  facebook = require('./facebook'),
  userConversation = require('./user-conversation'),
  serviceMappings = require('./service-mapping.js');
  NanoTimer = require('nanotimer');

const allServiceMappings = serviceMappings.loadAllMappings();

var process = (params) => {
  


  console.log("uttrerance ",params.utterance)
  console.log("params " + JSON.stringify(params,undefined,2));
  

  var lastConversation  = userConversation.getUserConversation(params.userId);
  console.log("LastConversation",lastConversation);
  if (lastConversation == undefined)
      flow.findFlow("NewCustomer").then(onFlowFound.bind(null,params,undefined));    
  else{
      luis.query(params.utterance).then(onLuisRespnose.bind(null,params)); //https://stackoverflow.com/questions/32912459/promises-pass-additional-parameters-to-then-chain

  }

}

var processQuickReply = (params) => {
  //console.log("utterance ",utterance);


  flow.findFlow(params.quickReply.payload).then(onFlowFound.bind(null,params,undefined));



}

var processMessageAttachment = (params) => {
  if (params.attachments[0].type === 'location'){
    console.log("received user location");
    var lastConversation  = userConversation.getUserConversation(params.userId);
    flow.findFlow(lastConversation.lastIntent +'.location').then(onFlowFound.bind(null,params,undefined));


  }
}

var onLuisRespnose = (params,response) => {
  console.log(`User intent ${response.intent}`);
  console.log("userId ", params.userId);
  console.log("entityMap ",response.entityMap); 
  
  

  flow.findFlow(response.intent).then(onFlowFound.bind(null,params,response.entityMap));
  
}

//entityMap is list of unique entities against luis utterance
var onFlowFound = (params,entityMap,intentFlow) => {
  console.log("Intent flow matched",JSON.stringify(intentFlow,undefined,2));
  
  //retrieving user profile
  facebook.retrieveUserProfile(params.userId).then((profile) => {
   

    let selectedAction = findAppropriateAction(entityMap,intentFlow);
    console.log("selectedAction ",JSON.stringify(selectedAction,undefined,1));
    if (selectedAction === undefined){
      //lets go for exceptionalFlow
      let exceptionAction = findExceptionAction(entityMap,intentFlow);
      if (exceptionAction === undefined){
        facebook.sendTextMessage(params.userId,"sorry no response is defined yet");
      }
    }
    else{
      //lets execute the selected action
      executeAction(params,profile,selectedAction,intentFlow,entityMap);
    }

  });

};

var findAppropriateAction = function(entityMap,intentFlow){
  let selectedAction;
  let anyActionExecuted = intentFlow.actions.some((a) => {
    let allRequiredEntityTypesFound = true;
    if (a.entityTypesRequired === undefined){
      selectedAction = a;
      return true; //breaking the loop for actions
    }
    a.entityTypesRequired.forEach((etr) => {
      if (!entityMap.has(etr)){ //since required entity type for action not found in the luis utterance so setting flag to skip this action
        allRequiredEntityTypesFound = false;
      }
    });

    console.log("allRequiredEntityTypesFound ",allRequiredEntityTypesFound);
    

    if (allRequiredEntityTypesFound){ //if all the required entity types found in the luis utterance, then proceed further for entity check 
      //lets check whether any of the entity exists in the luis utterance to qualify for execution of this action
      let entityFound = false;
      for (let i = 0;  i < a.entity.length; i++){
       
        for (let value of entityMap.values()) {
          console.log(`Going to match a.entity[${i}] ${a.entity[i]} with value.entity ${value.entity}`);
          if (a.entity[i] === value.entity){
            console.log("entity matched");
            entityFound = true;
            break;
          }
        }

        if (entityFound){
          break;
        }

       
      }

      if (entityFound){ //action qualifies for execution
        selectedAction = a;
        return true;
      }
    }
    
  });

  return selectedAction;

};

var findExceptionAction = function(entityMap,intentFlow){

}

var executeAction = function(params,profile,action,intentFlow,entityMap){
  console.log("executing action");
  let index = 1;
  action.responses.forEach((row) =>{
    var response = row[Math.floor(Math.random() * row.length)]; //selecting random response
    console.log("Response Selected",JSON.stringify(response,undefined,2));
    if (response.responseType === 'Text'){
      var txt = response.text;
      txt = txt.replace('{{user_first_name}}',profile.first_name);
      if (entityMap != undefined){
        for (let [entityType, entity] of entityMap.entries()) {
          console.log(`Going to replace {{${entityType}.${entity.entity}}} with ${entity.entity}`);
          txt = txt.replace(`{{${entityType}.entity}}`,entity.entity);
        }
      }
      

      setTimeout(facebook.sendTextMessage, 1200 * index++, params.userId, txt);

      //var timer = new NanoTimer();
      //timer.setTimeout(facebook.sendTextMessage,[senderId,txt],500 * index++ + '');
      //facebook.sendTextMessage(senderId,txt);
    }
    else if (response.responseType === 'QuickReply'){
      var txt = response.text;
      txt = txt.replace('{{user_first_name}}',profile.first_name);
      if (entityMap != undefined){
        for (let [entityType, entity] of entityMap.entries()) {
          console.log(`Going to replace {{${entityType}.${entity.entity}}} with ${entity.entity}`);
          txt = txt.replace(`{{${entityType}.entity}}`,entity.entity);
        }
      }
      
      setTimeout(facebook.sendQuickReply, 1200 * index++, params.userId, txt,response);
     
    }
    else if (response.responseType === 'ApiGatewayJson'){
      if (response.processingFunction === 'FindBranches'){
        var latitude = params.attachments[0].payload.coordinates.lat;
        var longitude = params.attachments[0].payload.coordinates.long;

      }
    }
    else{
      facebook.sendTextMessage(params.userId,"Sorry no response is defined yet");
    }
    
    var attributes = new Map();
    if (intentFlow.intentImportance != undefined){
      switch(intentFlow.intentImportance){
        case 'ServiceSelection':{
          console.log('intentFlow importance -> Service Selection');
          for (var i = 0; i < allServiceMappings.length; i++){
            if (allServiceMappings[i].utterance === params.utterance){
              attributes.set('selectedService',allServiceMappings[i].orchestraName);
              attributes.set('selectedServicePublicId',allServiceMappings[i].publicId);
              break;
            }
          }
          break;
        }
              
      }
    }

    userConversation.saveUserConversation(params.userId,intentFlow.intent,attributes);

  });
  return true;
};


module.exports.process = process;
module.exports.processQuickReply = processQuickReply;
module.exports.processMessageAttachment = processMessageAttachment;


