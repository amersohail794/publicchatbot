// import { setTimeout } from 'timers';

const
  https = require('https'),
  request = require('request'),
  axios = require('axios'),
  flow = require('./flow'),
  luis = require('./luis'),
  facebook = require('./facebook'),
  userConversation = require('./user-conversation'),
  serviceMappings = require('./service-mapping.js'),
  orchestra = require('./orchestra'),
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

var processPostback = (params) => {

  flow.findFlow(params.postback.payload).then(onFlowFound.bind(null,params,undefined));
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
      if (a.enttiy === undefined){
        selectedAction = a;
        return true;
      }

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

  let p = Promise.resolve();
  // action.responses.forEach((row) =>{

  //   p = p.then( _ => {
  //      new Promise((res) => {
  // // //       var response = row[Math.floor(Math.random() * row.length)]; //selecting random response
  // // //       // let subPromise = new Promise((resolve) => {
  // // //         processingResponse(null,response,params,profile,action,intentFlow,entityMap);
  // // //       // })
  // // //       // subPromise.then(() => {
  // // //         console.log("I am subPromise");
  // // //         // collectingUserState(res,params,profile,action,intentFlow,entityMap);
          
  // // //       // });
  //       console.log("1");
  //       processNumber(1,res);
  //     });
      
  //   });

  // });

  let abc = 0;
  action.responses.forEach((row) =>{
    p = p.then(() => new Promise(resolve =>{

        
        console.log(abc);
        // processNumber(1,resolve)
        let response = row[Math.floor(Math.random() * row.length)]; //selecting random response
        new Promise((res) => {
          setTimeout(processingResponse.bind(null,res,response,params,profile,action,intentFlow,entityMap),1500);
          // processingResponse(res,response,params,profile,action,intentFlow,entityMap);
        }).then(() => {
          collectingUserState(resolve,params,profile,action,intentFlow,entityMap);
        });
        
    }
    ));
    // console.log("I am done");
});
  


};

// var processNumber = ((number,resolve) => {
    
//   setTimeout( () => resolve(2),number* 5000);

// });



var collectingUserState = ((resolve,params,profile,action,intentFlow,entityMap) => {
  var attributes = new Map();
  if (intentFlow.intentImportance != undefined){
    switch(intentFlow.intentImportance){
      case 'ServiceSelection':{
        console.log('intentFlow importance -> Service Selection');
        for (var i = 0; i < allServiceMappings.length; i++){
          if (allServiceMappings[i].utterance === params.utterance){
            attributes.set('selectedService',allServiceMappings[i].orchestraName);
            attributes.set('selectedServicePublicId',allServiceMappings[i].publicId);
            attributes.set('selectedServiceInternalId',allServiceMappings[i].internalId);
            break;
          }
        }
        console.log("collectingUserState -> ServiceSelection");
        // resolve(true);
        break;
      }
      case 'BranchSelection':{
        console.log('intentFlow importance -> Branch Selection');
        let payloadTokens = params.postback.payload.split('.');
        attributes.set('selectedBranchInternalId',payloadTokens[payloadTokens.length-1]);
        //retrieving branch public id
        let responsePromise = orchestra.retrieveData('BRANCH_PUBLIC_DETAIL',new Map(Object.entries({SERVICE_ID:payloadTokens[payloadTokens.length-1]})),'get');
        responsePromise.then((branchDetail) => {
          attributes.set('selectedBranchPublicId',branchDetail.branch.publicId);
          console.log("collectinguserState -> BranchSelection");
          // resolve(true);
        }).catch((error) => {
          resolve(false);
          console.log("Error -> " + JSON.stringify(error,undefined,2));
        
        });
        
        break;
      }
            
    }

    
  }
 

  userConversation.saveUserConversation(params.userId,intentFlow.intent,attributes);
  resolve(true);
});

var processingTextResponse = ((response,params,profile,action,intentFlow,entityMap) => {
  var txt = response.text;
    txt = txt.replace('{{user_first_name}}',profile.first_name);
    if (entityMap != undefined){
      for (let [entityType, entity] of entityMap.entries()) {
        // console.log("entity -> " + JSON.stringify(entity,undefined,2));
        console.log(`Going to replace {{${entityType}.entity}} with ${entity.entity}`);
        txt = txt.replace(`{{${entityType}.entity}}`,entity.entity);
      }
    }
    
    facebook.sendTextMessage(params.userId,txt);
});

var processingQuickReplyResponse = ((response,params,profile,action,intentFlow,entityMap) => {
    var txt = response.text;
    txt = txt.replace('{{user_first_name}}',profile.first_name);
    if (entityMap != undefined){
      for (let [entityType, entity] of entityMap.entries()) {
        // console.log("entity -> " + JSON.stringify(entity,undefined,2));
        console.log(`Going to replace {{${entityType}.entity}} with ${entity.entity}`);
        txt = txt.replace(`{{${entityType}.entity}}`,entity.entity);
      }
    }
    facebook.sendQuickReply(params.userId,txt,response);
});

var processingApiGatewayJsonResponse =  ( (response,params,profile,action,intentFlow,entityMap) => {
  // console.log("I am insdie APIGateway")
  console.log(response.processingFunction);
  if (response.processingFunction === 'FindBranches'){
    var latitude = params.attachments[0].payload.coordinates.lat;
    var longitude = params.attachments[0].payload.coordinates.long;
    var lastConversation  = userConversation.getUserConversation(params.userId);
    let responsePromise = orchestra.retrieveData('BRANCHES',new Map(Object.entries({SERVICE_ID:lastConversation.attributes.selectedServiceInternalId,LATITUDE:latitude,LONGITUDE: longitude})),'get');
    return new Promise((resolve) => {
    responsePromise.then((branches) => {
      var branchList = new Array();

      branches.forEach((branch) => {
        let branchData = {
          title : branch.name,
          subTitle : branch.addressLine1 + ', '+branch.addressLine4 + ', ' + branch.addressLine5,
          imageURL : branch.addressLine3,
          actions : [] 
        };

        branchData.actions.push({type : 'postback', title : 'Select', payload : intentFlow.intent + '.selectedLocation.'+branch.id});
        branchList.push(branchData);
      });

      facebook.sendGenericMessage(params.userId,branchList);
      resolve(true);
    }).catch((error) => {
      console.log("Error -> " + JSON.stringify(error,undefined,2));
      facebook.sendTextMessage(params.userId,"There is problem in retrieving branches. Please try later");
      resolve(false);
    });
  });
    //facebook.sendTextMessage(params.userId,"FindBranches is not implemeneted yet");


  }
  else if (response.processingFunction === 'CheckAvailability'){
      console.log("Checking Availability");
      let ent = entityMap.get('builtin.datetimeV2.datetime');
      console.log("entity -> " + JSON.stringify(ent,undefined,2));
      let entityValue = ent.resolution.values[ent.resolution.values.length - 1].value;
      console.log("Entity Value -> " + entityValue);
      let valueParts = entityValue.split(' '); //2017-05-02 08:00:00
      let date = valueParts[0]; //2017-05-02
      let time = valueParts[1]; //08:00:00
      let timeParts = time.split(':');
      let timeFormat = timeParts[0] + ':'+timeParts[1]; //08:00
      console.log("TimeFormatted -> " + timeFormat);
      var lastConversation  = userConversation.getUserConversation(params.userId);
      let responsePromise = orchestra.retrieveData('AVAILABLE_TIMES',new Map(Object.entries({SERVICE_PUBLIC_ID:lastConversation.attributes.selectedServicePublicId,BRANCH_PUBLIC_ID:lastConversation.attributes.selectedBranchPublicId,DATE: date})),'get');
      return new Promise((resolve) => {
        responsePromise.then((availableTimes) => {
        
          let slotFound = false;
          availableTimes.times.forEach((t) => {
            if (t === timeFormat)
              console.log("slot found");
              slotFound = true;
            
          });
          if (slotFound){
            console.log("Setting datetime.value -> " + entityValue);
            let ent = {entity : entityValue};
            entityMap.set('datetime.entity',ent);
          }
          resolve(true);
          
          
        }).catch((error) => {
          console.log("Error -> " + JSON.stringify(error,undefined,2));
          facebook.sendTextMessage(params.userId,"There is problem in retrieving timeslots");
          resolve(false);
        });
      });

      
  }
});

var processingResponse = ((resolve,response,params,profile,action,intentFlow,entityMap) => {
  
  console.log("Response Selected",JSON.stringify(response,undefined,2));
  if (response.responseType === 'Text'){
    console.log("ResponseType ",response.responseType);
    processingTextResponse(response,params,profile,action,intentFlow,entityMap);
    resolve(true);
    //setTimeout(facebook.sendTextMessage, 1200 * index++, params.userId, txt);
  }
  else if (response.responseType === 'QuickReply'){
    console.log("ResponseType ",response.responseType);
    processingQuickReplyResponse(response,params,profile,action,intentFlow,entityMap);
    resolve(true);
    // setTimeout(facebook.sendQuickReply, 1200 * index++, params.userId, txt,response);
   
  }
  else if (response.responseType === 'ApiGatewayJson'){
    console.log("ResponseType ",response.responseType);
    let promise = processingApiGatewayJsonResponse(response,params,profile,action,intentFlow,entityMap);
    promise.then(() => {
      resolve(true);
    })

  }
  else{
    facebook.sendTextMessage(params.userId,"Sorry no response is defined yet");
    // resolve(true);
  }
  
});


module.exports.process = process;
module.exports.processQuickReply = processQuickReply;
module.exports.processMessageAttachment = processMessageAttachment;
module.exports.processPostback = processPostback;


