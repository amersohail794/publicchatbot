const
    userConversation = require('./user-conversation'),
    orchestra = require('./orchestra'),
    serviceMappings = require('./service-mapping.js'),
    logger = require('./winstonlogger')(__filename);

const allServiceMappings = serviceMappings.loadAllMappings();

var collectUserState =  ((processData) => {
    var attributes = new Map();
  
    return new Promise((resolve,reject) => {
      
      // if (intentFlow.intentImportance === undefined){
      //   userConversation.saveUserConversation(params.userId,intentFlow,attributes);
      // }
  
      // if (intentFlow.intentImportance != undefined){
        switch(processData.actionCurrentResponse.responseType){
          case 'ServiceSelection':{
            logger.debug('intentFlow importance -> Service Selection');
            for (var i = 0; i < allServiceMappings.length; i++){
              if (allServiceMappings[i].utterance === processData.actionCurrentResponse.text){
                attributes.set('selectedService',allServiceMappings[i].orchestraName);
                attributes.set('selectedServicePublicId',allServiceMappings[i].publicId);
                attributes.set('selectedServiceInternalId',allServiceMappings[i].internalId);
                break;
              }
            }
            logger.debug("collectingUserState -> ServiceSelection");
            userConversation.saveUserConversation(processData.requestParams.userId,processData.intentFlow,attributes);
            resolve(true);
            break;
          }
          case 'BranchSelection':{
            logger.debug('intentFlow importance -> Branch Selection');
            let payloadTokens = processData.requestParams.postback.payload.split('.');
            attributes.set('selectedBranchInternalId',payloadTokens[payloadTokens.length-1]);
            //retrieving branch public id
            let responsePromise = orchestra.makeRequest('BRANCH_PUBLIC_DETAIL',new Map(Object.entries({BRANCH_INTERNAL_ID:payloadTokens[payloadTokens.length-1]})),'get');
            responsePromise.then((branchDetail) => {
              attributes.set('selectedBranchPublicId',branchDetail.branch.publicId);
              attributes.set('selectedBranchTimezone',branchDetail.branch.timeZone);
              attributes.set('selectedBranchAddressLine1',branchDetail.branch.addressLine1);
              attributes.set('selectedBranchCity',branchDetail.branch.addressCity);
              attributes.set('selectedBranchCountry',branchDetail.branch.addressCountry);
             
              logger.debug("collectinguserState -> BranchSelection");
              userConversation.saveUserConversation(processData.requestParams.userId,processData.intentFlow,attributes);
              resolve(true);
              // resolve(true);
            }).catch((error) => {
              resolve(false);
              logger.debug("Error -> " + JSON.stringify(error,undefined,2));
            
            });
            
            break;
          }
          case 'DateTimeSelection':{
            logger.debug('intentFlow importance -> Appointment DateTime Selection');
            let ent = processData.entityMap.get('builtin.datetimeV2.datetime');
            logger.debug("entity -> " + JSON.stringify(ent,undefined,2));
            let dateTime = ent.resolution.values[ent.resolution.values.length - 1].value;
            // let dateTime = entityMap.get("runtime.datetime.value");
            if (dateTime !== undefined){
            
              let dateTimeArray = dateTime.split(' ');
              attributes.set("selectedDate",dateTimeArray[0]);
              attributes.set("selectedTime",dateTimeArray[1]);
            }
            
            userConversation.saveUserConversation(processData.requestParams.userId,processData.intentFlow,attributes);
            resolve(true);
            
            break;
          }
          case 'ApiGatewayJson':{
  
            switch(processData.actionCurrentResponse.processingFunction){
              case 'ConfirmAppointment':{
                logger.debug('intentFlow importance -> Appointment Confirmation');
                if (processData.responseExecutionOutput !== undefined && processData.responseExecutionOutput.publicId !== undefined){
                  attributes.set("appointmentConfirmationPublicId",processData.responseExecutionOutput.publicId);
                  attributes.set("status","APPOINTMENT_CONFIRMED_FOR_MEDICAL_TEST");
                }
                else if (processData.actionCurrentResponse !== undefined && processData.actionCurrentResponse.appointment !== undefined){
                  attributes.set("appointmentqpId",processData.actionCurrentResponse.appointment.qpId);
                  attributes.set("appointmentId",processData.actionCurrentResponse.appointment.id);
                }
                break;
              }
              case 'SearchCustomerFromOrchestra':{
                if (processData.responseExecutionOutput != undefined){
                    logger.debug("Setting customer public id to attributes");
                  attributes.set("customerOrchestraPublicId",processData.responseExecutionOutput.publicId);
                }
                break;
              }
              case 'CreateCustomerIfNeeded':{
                if (processData.responseExecutionOutput != undefined){
                    logger.debug("Setting customer public id to attributes");
                  attributes.set("customerOrchestraPublicId",processData.responseExecutionOutput.publicId);
                }
                break;
              }
              
            }
            
          
            userConversation.saveUserConversation(processData.requestParams.userId,processData.intentFlow,attributes).then(()=>{
                resolve(true);
            });
            
            break;
          }
          default:{
            userConversation.saveUserConversation(processData.requestParams.userId,processData.intentFlow,attributes).then(() => {
                resolve(true);
            });
          }
           
          
                
        }
    
        
      // }
     
    
      
    }); // end of Promise
  
    
  });

module.exports.collectUserState = collectUserState;