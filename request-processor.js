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
    NanoTimer = require('nanotimer'),
    Nightmare = require ('nightmare'),
    moment = require('moment-timezone'),
    //puppeteer = require('puppeteer'),
    globalObjectsFactory = require('./global-objects'),
    userStateManager = require('./user-state'),
    responseProcessor = require('./response-processor'),
    fs = require('fs'),
    logger = require('./winstonlogger')(__filename);

    



var process = (params) => {

    return new Promise((resolve,reject) => {
    
        let processData = globalObjectsFactory.getProcesDataObj();
        processData.requestParams = params;

        logger.debug("utterance ",params.utterance);
        
        

        logger.debug("params " + JSON.stringify(params,undefined,2));

        userConversation.getUserConversation(params.userId).then((lastConversation) => {

            params.utterance = utteranceFormatter(params.utterance,lastConversation);

            logger.debug("LastConversation",lastConversation);

            if (params.utterance == 'reset'){
                if (lastConversation != undefined){
                    userConversation.clearUserConversation();

                }

                facebook.sendTextMessage(params.userId,"reset done");
                return;
            }

            if (lastConversation == undefined)
                flow.findFlow("NewCustomer").then(onFlowFound.bind(null,processData));    
            else if (params.utterance === 'Internal.proceed'){
                userConversation.getNextStep(params.userId).then((stepName) => {
 
                    params.utterance = stepName;
                    flow.findFlow(stepName).then(onFlowFound.bind(null,processData));
                });
                
            }
            else if (params.utterance === 'Internal.moveUsecaseToInprocess'){
                userConversation.moveActiveUsecaseToInprocess(params.userId);
            }
            else{
                luis.query(params.utterance).then(onLuisRespnose.bind(null,processData)); //https://stackoverflow.com/questions/32912459/promises-pass-additional-parameters-to-then-chain
            }
        });
        
        resolve(true);

    });

}

var utteranceFormatter = (utterance,lastConversation) => {
    if (utterance != null 
        && parseInt(utterance) != "NaN"
        && lastConversation.activeUsecase != null
        && lastConversation.activeUsecase.attributes != null
        && lastConversation.activeUsecase.currentStep == "DateTimeSelection" && lastConversation.activeUsecase.attributes.selectedDate != undefined){
        
        return utterance + ":00";
        
    }
}

var processQuickReply = (params) => {
    logger.debug("processQuickReply");
    let processData = globalObjectsFactory.getProcesDataObj();
    processData.requestParams = params;
    flow.findFlow(params.quickReply.payload).then(onFlowFound.bind(null,processData));

}

var processMessageAttachment = (params) => {

    let processData = globalObjectsFactory.getProcesDataObj();
    processData.requestParams = params;

    return new Promise( (resolve,reject) => {

        if (params.attachments[0].type === 'location'){
            logger.debug("received user location");
            userConversation.getUserConversation(params.userId).then((lastConversation) => {
                return flow.findFlow(lastConversation.lastIntent +'.location')
            }).then((intentFlow) => {
                onFlowFound(processData,intentFlow);
                resolve(true);
            });

        }
    });

  
}

var processPostback = (params) => {
    let processData = globalObjectsFactory.getProcesDataObj();
    processData.requestParams = params;
    flow.findFlow(params.postback.payload).then(onFlowFound.bind(null,processData));
}

var onLuisRespnose = (processData,response) => {

    logger.debug(`User intent ${response.intent}`);
    logger.debug("userId ", processData.requestParams.userId);
    logger.debug("entityMap ",response.entityMap); 

    processData.entityMap = response.entityMap;

    flow.findFlow(response.intent).then(onFlowFound.bind(null,processData));
  
}

//entityMap is list of unique entities against luis utterance
var onFlowFound = (processData,intentFlow) => {
    logger.debug("Intent flow matched",JSON.stringify(intentFlow,undefined,2));
    processData.intentFlow = intentFlow;
    //retrieving user profile
    facebook.retrieveUserProfile(processData.requestParams.userId).then((profile) => {
        
        let selectedAction = findAppropriateAction(processData.entityMap,intentFlow);
        logger.debug("selectedAction ",JSON.stringify(selectedAction,undefined,1));
        if (selectedAction === undefined){
            //lets go for exceptionalFlow
            let exceptionAction = findExceptionAction(processData);
            if (exceptionAction === undefined){
                facebook.sendTextMessage(processData.requestParams.userId,"sorry no response is defined yet");
            }
        }
        else{
            processData.profile = profile;
            processData.selectedAction = selectedAction;
            //lets execute the selected action
            executeAction(processData);
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

    logger.debug("allRequiredEntityTypesFound ",allRequiredEntityTypesFound);
    

    if (allRequiredEntityTypesFound){ //if all the required entity types found in the luis utterance, then proceed further for entity check 
      //lets check whether any of the entity exists in the luis utterance to qualify for execution of this action
      let entityFound = false;
      if (a.enttiy === undefined){
        selectedAction = a;
        return true;
      }

      for (let i = 0;  i < a.entity.length; i++){
       
        for (let value of entityMap.values()) {
          logger.debug(`Going to match a.entity[${i}] ${a.entity[i]} with value.entity ${value.entity}`);
          if (a.entity[i] === value.entity){
            logger.debug("entity matched");
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

var findExceptionAction = async function(processData,exception){
    try{
        for (var i = 0; i < processData.selectedAction.exceptions.length; i++){

            if (processData.selectedAction.exceptions[i].exceptionType == exception){
                for (var j = 0; j < processData.selectedAction.exceptions[i].responses.length; j++){
                    let response = processData.selectedAction.exceptions[i].responses[j][Math.floor(Math.random() * processData.selectedAction.exceptions[i].responses[j].length)]; //selecting random response
                    logger.debug("Selected exception Response " + JSON.stringify(response,undefined,2));
                    processData.actionCurrentResponse = response;

                    if (processData.actionCurrentResponse.responseType === 'Internal'){
                        logger.debug("ResponseType ",processData.actionCurrentResponse.responseType);
                        
                        let p = {
                          userId : processData.requestParams.userId,
                          utterance : processData.actionCurrentResponse.responseType + '.' + processData.actionCurrentResponse.text
                        }
                        
                        await process(p);
                        break;
            
                    }else{
                        let responseResult = await responseProcessor.process(processData)
                        processData.responseExecutionOutput = responseResult;
                        logger.debug("I am before waiting");
                        await userStateManager.collectUserState(processData);
                        logger.debug("I am waiting");
                             
                    }    


                }
            }

        }
    }catch(error){
        logger.debug("Error in processing responses " + error);
        await findExceptionAction(processData,error);

    }
}

var executeAction = async function(processData){
    logger.debug("executing action");
    let index = 1;

    let p = Promise.resolve();

   

    try{
        for (var i = 0; i < processData.selectedAction.responses.length; i++){
            let response = processData.selectedAction.responses[i][Math.floor(Math.random() * processData.selectedAction.responses[i].length)]; //selecting random response
            logger.debug("Selected Resposne " + JSON.stringify(response,undefined,2));
            processData.actionCurrentResponse = response;
            
            if (processData.actionCurrentResponse.responseType === 'Internal'){
                logger.debug("ResponseType ",processData.actionCurrentResponse.responseType);
                
                let p = {
                  userId : processData.requestParams.userId,
                  utterance : processData.actionCurrentResponse.responseType + '.' + processData.actionCurrentResponse.text
                }
                
                await process(p);
                break;
    
            }else{
                let responseResult = await responseProcessor.process(processData)
                processData.responseExecutionOutput = responseResult;
                logger.debug("I am before waiting");
                await userStateManager.collectUserState(processData);
                logger.debug("I am waiting");
                     
            }
        }
    }catch(error){
        logger.debug("Error in processing responses " + error);
        await findExceptionAction(processData,error);

    }

    

    // processData.selectedAction.responses.forEach((row) =>{
    //     p = p.then(() => 
            
    //         new Promise((resolve,reject) =>{

    //             setTimeout(() => {
                    
    //                 let response = row[Math.floor(Math.random() * row.length)]; //selecting random response
    //                 logger.debug("Selected Resposne " + JSON.stringify(response,undefined,2));
    //                 processData.actionCurrentResponse = response;

    //                 if (processData.actionCurrentResponse.responseType === 'Internal'){
    //                     logger.debug("ResponseType ",processData.actionCurrentResponse.responseType);
                        
    //                     let p = {
    //                       userId : processData.requestParams.userId,
    //                       utterance : processData.actionCurrentResponse.responseType + '.' + processData.actionCurrentResponse.text
    //                     }
    //                     process(p).then(_ => resolve());
    //                 }else{
    //                     responseProcessor   
    //                         .process(processData)
    //                             .then((responseResult) => {
    //                                 processData.responseExecutionOutput = responseResult;
    //                                 userStateManager.collectUserState(processData);
    //                                 resolve();
    //                             })
    //                             .catch((error) => {
    //                                 responseFailedType = error;
    //                                 reject(error);
    //                             });   
    //                 }

                      
    //             },1500); //timeout interval between each response execution        
            

            
    //         })
    //     );
    //     // logger.debug("I am done");
    // });
  


};


module.exports.process = process;
module.exports.processQuickReply = processQuickReply;
module.exports.processMessageAttachment = processMessageAttachment;
module.exports.processPostback = processPostback;



