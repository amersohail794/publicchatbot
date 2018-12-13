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
  fs = require('fs');
  

const allServiceMappings = serviceMappings.loadAllMappings();

var process = (params) => {
  
  return new Promise((resolve,reject) => {
    
    console.log("uttrerance ",params.utterance)
    console.log("params " + JSON.stringify(params,undefined,2));
    
    userConversation.getUserConversation(params.userId)
      .then((lastConversation) => {
        console.log("LastConversation",lastConversation);

        if (lastConversation == undefined)
          flow.findFlow("NewCustomer").then(onFlowFound.bind(null,params,undefined));    
        else{
          luis.query(params.utterance).then(onLuisRespnose.bind(null,params)); //https://stackoverflow.com/questions/32912459/promises-pass-additional-parameters-to-then-chain
        }
    });
    resolve(true);

  });

}

var processQuickReply = (params) => {
  console.log("processQuickReply");

  flow.findFlow(params.quickReply.payload).then(onFlowFound.bind(null,params,undefined));

}

var processMessageAttachment = (params) => {

  return new Promise( (resolve,reject) => {
    
    if (params.attachments[0].type === 'location'){
      console.log("received user location");
      userConversation.getUserConversation(params.userId)
        .then((lastConversation) => {
          return flow.findFlow(lastConversation.lastIntent +'.location')
        }).then((intentFlow) => {
          onFlowFound(params,null,intentFlow);
          resolve(true);
        });
   
    }
  })

  
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
  facebook.retrieveUserProfile(params.userId)
    .then((profile) => {
   

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

  
  action.responses.forEach((row) =>{
    p = p.then(() => new Promise(resolve =>{

        setTimeout(() => {
          let response = row[Math.floor(Math.random() * row.length)]; //selecting random response
          processingResponse(response,params,profile,action,intentFlow,entityMap)
            .then((response) => {
              collectingUserState(params,profile,action,intentFlow,entityMap,response);
              resolve();
            });  
        },1500);        
        
        // processNumber(1,resolve)
        
        // new Promise((res) => {
        //   setTimeout(processingResponse.bind(null,res,response,params,profile,action,intentFlow,entityMap),1500);
        //   // processingResponse(res,response,params,profile,action,intentFlow,entityMap);
        // }).then((response) => {
          
        //     .then(_ => resolve(true));
        // });
        
    }
    ));
    // console.log("I am done");
});
  


};

// var processNumber = ((number,resolve) => {
    
//   setTimeout( () => resolve(2),number* 5000);

// });



var collectingUserState = ((params,profile,action,intentFlow,entityMap,response) => {
  var attributes = new Map();

  return new Promise((resolve,reject) => {
    
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
          userConversation.saveUserConversation(params.userId,intentFlow,attributes);
          resolve(true);
          break;
        }
        case 'BranchSelection':{
          console.log('intentFlow importance -> Branch Selection');
          let payloadTokens = params.postback.payload.split('.');
          attributes.set('selectedBranchInternalId',payloadTokens[payloadTokens.length-1]);
          //retrieving branch public id
          let responsePromise = orchestra.makeRequest('BRANCH_PUBLIC_DETAIL',new Map(Object.entries({BRANCH_INTERNAL_ID:payloadTokens[payloadTokens.length-1]})),'get');
          responsePromise.then((branchDetail) => {
            attributes.set('selectedBranchPublicId',branchDetail.branch.publicId);
            attributes.set('selectedBranchTimezone',branchDetail.branch.timeZone);
            attributes.set('selectedBranchAddressLine1',branchDetail.branch.addressLine1);
            attributes.set('selectedBranchCity',branchDetail.branch.addressCity);
            attributes.set('selectedBranchCountry',branchDetail.branch.addressCountry);
           
            console.log("collectinguserState -> BranchSelection");
            userConversation.saveUserConversation(params.userId,intentFlow,attributes);
            resolve(true);
            // resolve(true);
          }).catch((error) => {
            resolve(false);
            console.log("Error -> " + JSON.stringify(error,undefined,2));
          
          });
          
          break;
        }
        case 'AppointmentDateTimeSelection':{
          console.log('intentFlow importance -> Appointment DateTime Selection');
  
          let dateTime = entityMap.get("runtime.datetime.value");
          if (dateTime !== undefined){
          
            let dateTimeArray = dateTime.split(' ');
            attributes.set("selectedDate",dateTimeArray[0]);
            attributes.set("selectedTime",dateTimeArray[1]);
          }
          
          userConversation.saveUserConversation(params.userId,intentFlow,attributes);
          resolve(true);
          
          break;
        }
        case 'AppointmentConfirmation':{
          console.log('intentFlow importance -> Appointment Confirmation');
          if (response !== undefined && response.publicId !== undefined){
            attributes.set("appointmentConfirmationPublicId",response.publicId);
            attributes.set("status","APPOINTMENT_CONFIRMED_FOR_MEDICAL_TEST");
          }
          else if (response !== undefined && response.appointment !== undefined){
            attributes.set("appointmentqpId",response.appointment.qpId);
            attributes.set("appointmentId",response.appointment.id);
          }
          userConversation.saveUserConversation(params.userId,intentFlow,attributes);
          resolve(true);
          break;
        }
        
              
      }
  
      
    }
   
  
    
  }); // end of Promise

  
});

var processingTextResponse = ((response,params,profile,action,intentFlow,entityMap) => {

  return new Promise((resolve,reject) => {
    var txt = response.text;
    txt = txt.replace('{{user_first_name}}',profile.first_name);
    if (entityMap != undefined){
      for (let [entityType, entity] of entityMap.entries()) {
        // console.log("entity -> " + JSON.stringify(entity,undefined,2));
        if (entityType.startsWith('runtime')){
          console.log(`Going to replace {{${entityType}}} with ${entity}`);
          txt = txt.replace(`{{${entityType}}}`,entity);

        }
        else{
          console.log(`Going to replace {{${entityType}.entity}} with ${entity.entity}`);
          txt = txt.replace(`{{${entityType}.entity}}`,entity.entity);
        }
      }
    }
    
    facebook.sendTextMessage(params.userId,txt)
      .then(_ => resolve(true))
      .catch(() => reject("Could not send text response"));
  });


  
});

var processingQuickReplyResponse = ((response,params,profile,action,intentFlow,entityMap) => {
    
    return new Promise((resolve,reject) => {
      var txt = response.text;
      txt = txt.replace('{{user_first_name}}',profile.first_name);
      if (entityMap != undefined){
        for (let [entityType, entity] of entityMap.entries()) {
          // console.log("entity -> " + JSON.stringify(entity,undefined,2));
          if (entityType.startsWith('runtime')){
            console.log(`Going to replace {{${entityType}}} with ${entity}`);
            txt = txt.replace(`{{${entityType}}}`,entity);

          }
          else{
            console.log(`Going to replace {{${entityType}.entity}} with ${entity.entity}`);
            txt = txt.replace(`{{${entityType}.entity}}`,entity.entity);
          }
            
            
        }
      }
      facebook.sendQuickReply(params.userId,txt,response)
        .then(_ => resolve(true))
        .catch(() => reject("Could not send quick reply response"));
    });
    
});

var processingApiGatewayJsonResponse =  ( (response,params,profile,action,intentFlow,entityMap) => {
  // console.log("I am insdie APIGateway")
  console.log(response.processingFunction);
  if (response.processingFunction === 'FindBranches'){
    
    return new Promise((resolve,reject) => {

      var latitude = params.attachments[0].payload.coordinates.lat;
      var longitude = params.attachments[0].payload.coordinates.long;

      userConversation.getUserConversation(params.userId).then((lastConversation) => {

        return orchestra.makeRequest('BRANCHES',new Map(Object.entries({SERVICE_ID:lastConversation.activeUsecase.attributes.selectedServiceInternalId,LATITUDE:latitude,LONGITUDE: longitude})),'get');
      }).then((branches) => { //process branches data
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

        return facebook.sendGenericMessage(params.userId,branchList);
      
      }).then(_ =>  resolve(true)) //acknowledged from facebook
      .catch((error) => {
        console.log("Error -> " + JSON.stringify(error,undefined,2));
        facebook.sendTextMessage(params.userId,"There is problem in retrieving branches. Please try later");
        reject("Error -> " + JSON.stringify(error,undefined,2));
      });
    }); //ended promise execution
    
    
   
    // return new Promise((resolve) => {
    // responsePromise.
  // });
    //facebook.sendTextMessage(params.userId,"FindBranches is not implemeneted yet");


  }
  else if (response.processingFunction === 'CheckAvailability'){
      console.log("Checking Availability");

      return new Promise((resolve,reject) => {

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
        userConversation.getUserConversation(params.userId).then((lastConversation) => {
          return orchestra.makeRequest('AVAILABLE_TIMES',new Map(Object.entries({SERVICE_PUBLIC_ID:lastConversation.activeUsecase.attributes.selectedServicePublicId,BRANCH_PUBLIC_ID:lastConversation.activeUsecase.attributes.selectedBranchPublicId,DATE: date})),'get');  
        }).then((availableTimes) => {
          
          let slotFound = false;
          availableTimes.times.forEach((t) => {
            if (t === timeFormat){
              console.log("slot found");
              slotFound = true;
            }
              
            
          });
          if (slotFound){
            console.log("Setting runtime.datetime.value -> " + entityValue);
            
            entityMap.set('runtime.datetime.value',entityValue);
          }
          resolve(true);
          
          
        }).catch((error) => {
          console.log("Error -> " + JSON.stringify(error,undefined,2));
          facebook.sendTextMessage(params.userId,"There is problem in retrieving timeslots");
          reject("Error -> " + JSON.stringify(error,undefined,2));
        });
      }) //end of promise
  }
  else if (response.processingFunction ==='ConfirmAppointment'){
    console.log("Confirming Appointment...");

    return new Promise((resolve,reject) => {
      userConversation.getUserConversation(params.userId)
        .then((lastConversation) => {
        let selectedTime = lastConversation.activeUsecase.attributes.selectedTime;
        let selectedTimeComponents = selectedTime.split(':');
        let selectedTimeFormat = selectedTimeComponents[0] + ':' +selectedTimeComponents[1];
        let postData = {
          services : [{publicId : lastConversation.activeUsecase.attributes.selectedServicePublicId}],
          customers : []
        };
        return orchestra.makeRequest('CONFIRM_APPOINTMENT',new Map(Object.entries(
            {SERVICE_PUBLIC_ID:lastConversation.activeUsecase.attributes.selectedServicePublicId,
              BRANCH_PUBLIC_ID:lastConversation.activeUsecase.attributes.selectedBranchPublicId,
              DATE: lastConversation.activeUsecase.attributes.selectedDate,
              TIME : selectedTimeFormat}
            )),'post',postData);  
      }).then((appointmentDetails) => {
        
        //facebook.sendTextMessage("Your appointment is confirmed wtih refernce id " + appointmentDetails.appointment.qpId) ;
        resolve(appointmentDetails);
      });

    });

    
  }
  else if (response.processingFunction ==='SendAppointmentDetail'){
    console.log("Sending Appointment Detail...");

    return new Promise((resolve,reject) => {
      userConversation.getUserConversation(params.userId)
        .then((lastConversation) => {
        let appointmentPublicId = lastConversation.activeUsecase.attributes.appointmentConfirmationPublicId;
       
        return orchestra.makeRequest('APPOINTMENT_DETAIL',new Map(Object.entries(
            {APPOINTMENT_PUBLIC_ID:appointmentPublicId}
            )),'get');  
      }).then((appointmentDetails) => {
        
        createAppointmentImage(appointmentDetails,params).then((imageURL) => {
          console.log("image URL " + imageURL);
          facebook.sendTextMessage(params.userId,"Your appointment is created successfully with id " + appointmentDetails.appointment.qpId) ;
          facebook.sendImageMessage(params.userId,imageURL)
          resolve(appointmentDetails);
        });

        
      });

    });

    
  }
  else{
    console.log("No APIGateway processing found")
  }
});


var createAppointmentImage = (appointmentDetails,params) =>{

  return new Promise((resolve,reject) => {
    userConversation.getUserConversation(params.userId)
      .then((lastConversation) => {
        let timezone = lastConversation.activeUsecase.attributes.selectedBranchTimezone;
        var template_content = fs.readFileSync('public/appointment_template.html','utf8');
        console.log(template_content);
        console.log(timezone);
        let timeZoneStartTime = moment(appointmentDetails.appointment.start).tz(timezone);
        let timeZoneEndTime = moment(appointmentDetails.appointment.end).tz(timezone);
        console.log(timeZoneStartTime.format());
        console.log(timeZoneStartTime.format('hh:mm'));



        template_content = template_content.replace('[SERVICE_NAME]',appointmentDetails.appointment.services[0].name);
        template_content = template_content.replace('[TIME_SLOT]',timeZoneStartTime.format('hh:mm') + ' - ' + timeZoneEndTime.format('hh:mm'));
        let ld = timeZoneStartTime.localeData();
        template_content = template_content.replace('[DATE]',timeZoneStartTime.format('dddd, MMMM Do YYYY'));
        template_content = template_content.replace('[BRANCH_NAME]',appointmentDetails.appointment.branch.name);
        template_content = template_content.replace('[ADDRESS]',lastConversation.activeUsecase.attributes.selectedBranchAddressLine1);
        template_content = template_content.replace('[CITY]',lastConversation.activeUsecase.attributes.selectedBranchCity);
        template_content = template_content.replace('[COUNTRY]',lastConversation.activeUsecase.attributes.selectedBranchCountry);
        console.log(ld.weekdays(timeZoneStartTime));




        try{
          fs.writeFileSync('public/appointment_content_'+appointmentDetails.appointment.qpId+'.html',template_content);  
        }catch(e){
          console.log(e);
        }
        console.log("Creating Appointment image", appointmentDetails);

        const nightmare = Nightmare();
        console.log("SERVER_url ",facebook.SERVER_URL);
        nightmare
        .viewport(300, 350)
        .goto(facebook.SERVER_URL+'/appointment_content_'+appointmentDetails.appointment.qpId+'.html')
        
        .screenshot('public/appointment_content_'+appointmentDetails.appointment.qpId+'.png') 
        .end()
        .then(() => {
          
          console.log('screenshot is done');
          resolve(facebook.SERVER_URL+'/appointment_content_'+appointmentDetails.appointment.qpId+'.png');
        })
      });  
  });

}

var processingResponse = ((response,params,profile,action,intentFlow,entityMap) => {
  console.log("Response Selected",JSON.stringify(response,undefined,2));
  return new Promise((resolve) => {
    if (response.responseType === 'Text'){
      console.log("ResponseType ",response.responseType);
      processingTextResponse(response,params,profile,action,intentFlow,entityMap)
        .then(_ => resolve());
      // resolve(true);
      //setTimeout(facebook.sendTextMessage, 1200 * index++, params.userId, txt);
    }
    else if (response.responseType === 'QuickReply'){
      console.log("ResponseType ",response.responseType);
      processingQuickReplyResponse(response,params,profile,action,intentFlow,entityMap)
        .then(_ => resolve());
      // setTimeout(facebook.sendQuickReply, 1200 * index++, params.userId, txt,response);
     
    }
    else if (response.responseType === 'ApiGatewayJson'){
      console.log("ResponseType ",response.responseType);
      processingApiGatewayJsonResponse(response,params,profile,action,intentFlow,entityMap)
        .then((response) => resolve(response));
     
    }
    else{
      facebook.sendTextMessage(params.userId,"Sorry no response is defined yet");
       resolve();
    }
  }); //end of Promise

 
  
  
});


module.exports.process = process;
module.exports.processQuickReply = processQuickReply;
module.exports.processMessageAttachment = processMessageAttachment;
module.exports.processPostback = processPostback;
module.exports.createAppointmentImage = createAppointmentImage;


