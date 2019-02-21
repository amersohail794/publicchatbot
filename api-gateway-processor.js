const
    facebook = require('./facebook'),
    userConversation = require('./user-conversation'),
    orchestra = require('./orchestra'),
    fs = require('fs'),
    Nightmare = require ('nightmare'),
    moment = require('moment-timezone'),
    qrcode = require('qrcode'),
    util = require('./util'),
    logger = require('./winstonlogger')(__filename);

var processingApiGatewayJsonResponse =  ( (processData) => {
    // logger.debug("I am insdie APIGateway")
    logger.debug(processData.actionCurrentResponse.processingFunction);
    if (processData.actionCurrentResponse.processingFunction === 'FindBranches'){
      
      return new Promise((resolve,reject) => {
  
        var latitude = processData.requestParams.attachments[0].payload.coordinates.lat;
        var longitude = processData.requestParams.attachments[0].payload.coordinates.long;
  
        userConversation.getUserConversation(processData.requestParams.userId).then((lastConversation) => {
  
          return orchestra.makeRequest('BRANCHES',new Map(Object.entries({SERVICE_ID:lastConversation.activeUsecase.attributes.selectedServiceInternalId,LATITUDE:latitude,LONGITUDE: longitude})),'get');
        }).then((branches) => { //process branches data
            logger.debug("processing branches from orchestra");
          var branchList = new Array();
  
          branches.forEach((branch) => {
            let branchData = {
              title : branch.name,
              subTitle : branch.addressLine1 + ', '+branch.addressLine4 + ', ' + branch.addressLine5,
              imageURL : branch.addressLine3,
              actions : [] 
            };
  
            branchData.actions.push({type : 'postback', title : 'Select', payload : processData.intentFlow.usecase + '.' + processData.intentFlow.stepName + '.selectedLocation.'+branch.id});
            branchList.push(branchData);
          });
  
          return facebook.sendGenericMessage(processData.requestParams.userId,branchList);
        
        }).then(_ =>  resolve(true)) //acknowledged from facebook
        .catch((error) => {
          logger.debug("Error -> " + JSON.stringify(error,undefined,2));
          facebook.sendTextMessage(processData.requestParams.userId,"There is problem in retrieving branches. Please try later");
          reject("Error -> " + JSON.stringify(error,undefined,2));
        });
      }); //ended promise execution
      
      
     
      // return new Promise((resolve) => {
      // responsePromise.
    // });
      //facebook.sendTextMessage(params.userId,"FindBranches is not implemeneted yet");
  
  
    }
    else if (processData.actionCurrentResponse.processingFunction === 'CheckAvailability'){
        logger.debug("Checking Availability");
  
        return new Promise((resolve,reject) => {
  
          let ent = processData.entityMap.get('builtin.datetimeV2.datetime');
          logger.debug("entity -> " + JSON.stringify(ent,undefined,2));
          let entityValue = ent.resolution.values[ent.resolution.values.length - 1].value;

         
           
            if (ent.resolution.values.length > 1 && !util.isTimeInRange( util.separateDateTime(entityValue)[1],processData.selectedAction.timeFilter)){
                entityValue = ent.resolution.values[0].value;
            }


          logger.debug("Entity Value -> " + entityValue);
          let valueParts = util.separateDateTime(entityValue); //2017-05-02 08:00:00
          let date = valueParts[0]; //2017-05-02
          let time = valueParts[1]; //08:00:00
          
          let timeFormat = util.timeInhhmm(time);
          logger.debug("TimeFormatted -> " + timeFormat);
          userConversation.getUserConversation(processData.requestParams.userId).then((lastConversation) => {
            return orchestra.makeRequest('AVAILABLE_TIMES',new Map(Object.entries({SERVICE_PUBLIC_ID:lastConversation.activeUsecase.attributes.selectedServicePublicId,BRANCH_PUBLIC_ID:lastConversation.activeUsecase.attributes.selectedBranchPublicId,DATE: date})),'get');  
          }).then((availableTimes) => {
            
            let slotFound = false;
            availableTimes.times.forEach((t) => {
              if (t === timeFormat){
                logger.debug("slot found");
                slotFound = true;
              }
                
              
            });
            if (slotFound){
              logger.debug("Setting runtime.datetime.value -> " + entityValue);
              
              processData.entityMap.set('runtime.datetime.value',entityValue);
              resolve(true);
            }
            else{
                reject("SlotNotAvailable");
            }
            
            
            
          }).catch((error) => {
            logger.debug("Error -> " + JSON.stringify(error,undefined,2));
            facebook.sendTextMessage(processData.requestParams.userId,"There is problem in retrieving timeslots");
            reject("Error -> " + JSON.stringify(error,undefined,2));
          });
        }) //end of promise
    }
    else if (processData.actionCurrentResponse.processingFunction === 'CheckDatesAvailability'){
        logger.debug("Checking dates Availability");
  
        return new Promise((resolve,reject) => {
  
          let ent = processData.entityMap.get('builtin.datetimeV2.date');
          logger.debug("entity -> " + JSON.stringify(ent,undefined,2));
          let entityValue = ent.resolution.values[ent.resolution.values.length - 1].value;
          logger.debug("Entity Value -> " + entityValue);
          let valueParts = entityValue.split(' '); //2017-05-02 08:00:00
          let date = valueParts[0]; //2017-05-02
         
          userConversation.getUserConversation(processData.requestParams.userId).then((lastConversation) => {
            return orchestra.makeRequest('AVAILABLE_TIMES',new Map(Object.entries({SERVICE_PUBLIC_ID:lastConversation.activeUsecase.attributes.selectedServicePublicId,BRANCH_PUBLIC_ID:lastConversation.activeUsecase.attributes.selectedBranchPublicId,DATE: date})),'get');  
          }).then((availableTimes) => {
            
            let slotFound = availableTimes.times.length > 0 ? true : false;
            
            if (slotFound){
              
              resolve(true);
            }
            else{
                reject("SlotNotAvailable");
            }
            
            
            
          }).catch((error) => {
            logger.debug("Error -> " + JSON.stringify(error,undefined,2));
            facebook.sendTextMessage(processData.requestParams.userId,"There is problem in retrieving timeslots");
            reject("Error -> " + JSON.stringify(error,undefined,2));
          });
        }) //end of promise
    }
    else if (processData.actionCurrentResponse.processingFunction === 'CheckTimeAvailability'){
        logger.debug("Checking time Availability");
  
        return new Promise((resolve,reject) => {
  
          let ent = processData.entityMap.get('builtin.datetimeV2.time');
          logger.debug("entity -> " + JSON.stringify(ent,undefined,2));
          let entityValue = ent.resolution.values[ent.resolution.values.length - 1].value;

          if (ent.resolution.values.length > 1 && !util.isTimeInRange(entityValue,processData.selectedAction.timeFilter)){
            entityValue = ent.resolution.values[0].value;
            } 
        
          logger.debug("Entity Value -> " + entityValue);
          let valueParts = entityValue.split(' '); //2017-05-02 08:00:00
         // let date = valueParts[0]; //2017-05-02
          let time = valueParts[0]; //08:00:00
          let timeParts = time.split(':');
          let timeFormat = timeParts[0] + ':'+timeParts[1]; //08:00
          logger.debug("TimeFormatted -> " + timeFormat);
          userConversation.getUserConversation(processData.requestParams.userId).then((lastConversation) => {
            return orchestra.makeRequest('AVAILABLE_TIMES',new Map(Object.entries({SERVICE_PUBLIC_ID:lastConversation.activeUsecase.attributes.selectedServicePublicId,BRANCH_PUBLIC_ID:lastConversation.activeUsecase.attributes.selectedBranchPublicId,DATE: lastConversation.activeUsecase.attributes.selectedDate})),'get');  
          }).then((availableTimes) => {
            
            let slotFound = false;
            availableTimes.times.forEach((t) => {
              if (t === timeFormat){
                logger.debug("slot found");
                slotFound = true;
              }
                
              
            });
            if (slotFound){
              logger.debug("Setting runtime.datetime.value -> " + entityValue);
              
              processData.entityMap.set('runtime.datetime.value',entityValue);
              resolve(true);
            }
            else{
                reject("SlotNotAvailable");
            }
            
            
            
          }).catch((error) => {
            logger.debug("Error -> " + JSON.stringify(error,undefined,2));
            facebook.sendTextMessage(processData.requestParams.userId,"There is problem in retrieving timeslots");
            reject("Error -> " + JSON.stringify(error,undefined,2));
          });
        }) //end of promise
    }
    else if (processData.actionCurrentResponse.processingFunction === 'FindEmptySlots'){
        logger.debug("Finding Empty slots");
  
        return new Promise((resolve,reject) => {
  
        //   let ent = processData.entityMap.get('builtin.datetimeV2.datetime');
        //   logger.debug("entity -> " + JSON.stringify(ent,undefined,2));
        //   let entityValue = ent.resolution.values[ent.resolution.values.length - 1].value;
        //   logger.debug("Entity Value -> " + entityValue);
        //   let valueParts = entityValue.split(' '); //2017-05-02 08:00:00
        //   let date = lastConversation.activeUsecase.attributes.selectedDate;//valueParts[0]; //2017-05-02
           let time = null;//lastConversation.activeUsecase.attributes.selectedTime;//valueParts[1]; //08:00:00
        //   let timeParts = time.split(':');
        //   let timeFormat = timeParts[0] + ':'+timeParts[1]; //08:00
        //   let timeInSeconds = timeParts[0] * 60 + timeParts[1];
        //   logger.debug("TimeFormatted -> " + timeFormat);
          userConversation.getUserConversation(processData.requestParams.userId).then((lastConversation) => {
            time = lastConversation.activeUsecase.attributes.selectedTime;
            return orchestra.makeRequest('AVAILABLE_TIMES',new Map(Object.entries({SERVICE_PUBLIC_ID:lastConversation.activeUsecase.attributes.selectedServicePublicId,BRANCH_PUBLIC_ID:lastConversation.activeUsecase.attributes.selectedBranchPublicId,DATE: lastConversation.activeUsecase.attributes.selectedDate})),'get');  
          }).then((availableTimes) => {
            
            
            let timeParts = time.split(':');
            let timeFormat = timeParts[0] + ':'+timeParts[1]; //08:00
            let timeInSeconds = timeParts[0] * 60 + timeParts[1];
          logger.debug("TimeFormatted -> " + timeFormat);
           
            let availableTimesRanking = [];

            availableTimes.times.forEach((t) => {
                let parts = t.split(':');
                let seconds = parts[0] * 60 + parts[1];
                
                availableTimesRanking.push({time : t, slotScore : Math.abs(timeInSeconds - seconds)});
                availableTimesRanking.sort((slot1,slot2) => slot1.slotScore - slot2.slotScore);
            });
            
            let timesOptions = {options : []};
            
            let limit = availableTimesRanking.length > 2 ? 2 : availableTimesRanking.length;
            for (let i = 0; i < limit; i++){
                let option = {
                    content_type : 'text',
                    title : availableTimesRanking[i].time,
                    payload : 'RenewVisaMedicalTest.SelectedTime.'+availableTimesRanking[i].time
                }
                timesOptions.options.push(option);
            }

            
            if (timesOptions.options.length > 0)

                return facebook.sendQuickReply(processData.requestParams.userId,"Below are the available time slots nearest to requested time",timesOptions);
            else
                reject("NoSlot");
            
            
            }).then(_ =>  resolve(true)) //acknowledged from facebook  
            .catch((error) => {
            logger.debug("Error -> " + JSON.stringify(error,undefined,2));
            facebook.sendTextMessage(processData.requestParams.userId,"There is problem in retrieving timeslots");
            reject("Error -> " + JSON.stringify(error,undefined,2));
          });
        }) //end of promise
    }
    else if (processData.actionCurrentResponse.processingFunction ==='ConfirmAppointment'){
        logger.debug("Confirming Appointment...");

        return new Promise((resolve,reject) => {
            userConversation.getUserConversation(processData.requestParams.userId)
                .then((lastConversation) => {
                let selectedTime = lastConversation.activeUsecase.attributes.selectedTime;
                let selectedTimeComponents = selectedTime.split(':');
                let selectedTimeFormat = selectedTimeComponents[0] + ':' +selectedTimeComponents[1];
                let postData = {
                services : [{publicId : lastConversation.activeUsecase.attributes.selectedServicePublicId}],
                customers : []
                };

                if (lastConversation.activeUsecase.attributes.customerOrchestraPublicId != null){
                    postData.customers.push({ publicId : lastConversation.activeUsecase.attributes.customerOrchestraPublicId});
                }

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
  
      
    }else if (processData.actionCurrentResponse.processingFunction ==='SearchCustomerFromOrchestra'){
      logger.debug("searching Customer... ");
  
      return new Promise((resolve,reject) => {
        
        return orchestra.makeRequest('SEARCH_CUSTOMER',new Map(Object.entries(
            {EXTERNAL_ID:processData.requestParams.userId}
            )),'get',null)
            .then((customerDetails) => {
  
              logger.debug("Total Customers Found -> ",customerDetails.meta.totalResults);
  
              if (customerDetails.meta.totalResults === 0){
                resolve();
                return; 
              }
  
              let customerInfo = customerDetails.customerList[0]; 
              resolve(customerInfo);
              //facebook.sendTextMessage("Your appointment is confirmed wtih refernce id " + appointmentDetails.appointment.qpId) ;
              
        });
  
      });
      
    }else if (processData.actionCurrentResponse.processingFunction ==='CreateCustomerIfNeeded'){
        logger.debug("Creating Customer If Needed... ");

        return new Promise((resolve,reject) => {
            userConversation.getUserConversation(processData.requestParams.userId)
                .then((lastConversation) => {
                let orchestraPublicId = lastConversation.activeUsecase.attributes.customerOrchestraPublicId;

                if (orchestraPublicId != null){
                    resolve();
                }
                else{

                    let postData = {
                        firstName : processData.profile.first_name,
                        lastName : processData.profile.last_name,
                        externalId : processData.requestParams.userId
                    }

                    return orchestra.makeRequest('CREATE_CUSTOMER',new Map(),'post',postData); 


                }


               
            }).then((customerDetails) => {
                    
                //facebook.sendTextMessage("Your appointment is confirmed wtih refernce id " + appointmentDetails.appointment.qpId) ;
                resolve(customerDetails);
            });
        });
      
    }else if (processData.actionCurrentResponse.processingFunction ==='SendAppointmentDetail'){
      logger.debug("Sending Appointment Detail...");
  
      return new Promise((resolve,reject) => {
        userConversation.getUserConversation(processData.requestParams.userId)
          .then((lastConversation) => {
          let appointmentPublicId = lastConversation.activeUsecase.attributes.appointmentConfirmationPublicId;
         
          return orchestra.makeRequest('APPOINTMENT_DETAIL',new Map(Object.entries(
              {APPOINTMENT_PUBLIC_ID:appointmentPublicId}
              )),'get');  
        }).then((appointmentDetails) => {
          
          createAppointmentImage(appointmentDetails,processData.requestParams).then((imageURL) => {
            logger.debug("image URL " + imageURL);
            facebook.sendTextMessage(processData.requestParams.userId,"Your appointment is created successfully with id " + appointmentDetails.appointment.qpId) ;
            facebook.sendImageMessage(processData.requestParams.userId,imageURL)
            resolve(appointmentDetails);
          });
  
          
        });
  
      });
  
      
    }
    else{
      logger.debug("No APIGateway processing found")
    }
  });

  
async function createAppointmentImage(appointmentDetails,params){
    let lastConversation = await userConversation.getUserConversation(params.userId);

    let timezone = lastConversation.activeUsecase.attributes.selectedBranchTimezone;
    var template_content = fs.readFileSync('public/appointment_template.html','utf8');
    logger.debug(template_content);
    logger.debug(timezone);
    let timeZoneStartTime = moment(appointmentDetails.appointment.start).tz(timezone);
    let timeZoneEndTime = moment(appointmentDetails.appointment.end).tz(timezone);
    logger.debug(timeZoneStartTime.format());
    logger.debug(timeZoneStartTime.format('hh:mm'));



    template_content = template_content.replace('[SERVICE_NAME]',appointmentDetails.appointment.services[0].name);
    template_content = template_content.replace('[TIME_SLOT]',timeZoneStartTime.format('hh:mm') + ' - ' + timeZoneEndTime.format('hh:mm'));
    let ld = timeZoneStartTime.localeData();
    template_content = template_content.replace('[DATE]',timeZoneStartTime.format('dddd, MMMM Do YYYY'));
    template_content = template_content.replace('[BRANCH_NAME]',appointmentDetails.appointment.branch.name);
    template_content = template_content.replace('[ADDRESS]',lastConversation.activeUsecase.attributes.selectedBranchAddressLine1);
    template_content = template_content.replace('[CITY]',lastConversation.activeUsecase.attributes.selectedBranchCity);
    template_content = template_content.replace('[COUNTRY]',lastConversation.activeUsecase.attributes.selectedBranchCountry);
    
    let code = await createQRCode("" +appointmentDetails.appointment.qpId);
    template_content = template_content.replace('[QRCODE]',code);

    logger.debug(ld.weekdays(timeZoneStartTime));




    try{
        fs.writeFileSync('public/appointment_content_'+appointmentDetails.appointment.qpId+'.html',template_content);  
    }catch(e){
        logger.debug(e);
    }
    logger.debug("Creating Appointment image", appointmentDetails);

    const nightmare = Nightmare();
    logger.debug("SERVER_url ",facebook.SERVER_URL);
    await nightmare
        .viewport(300, 460)
        .goto(facebook.SERVER_URL+'/appointment_content_'+appointmentDetails.appointment.qpId+'.html')
        
        .screenshot('public/appointment_content_'+appointmentDetails.appointment.qpId+'.png') 
        .end();
    logger.debug('screenshot is done');
    return facebook.SERVER_URL+'/appointment_content_'+appointmentDetails.appointment.qpId+'.png';


}

async function createQRCode(appointmentId){
    let res = await qrcode.toDataURL(appointmentId);
    return res;
}

  
//   var createAppointmentImage = (appointmentDetails,params) =>{
  
//     return new Promise((resolve,reject) => {
//       userConversation.getUserConversation(params.userId)
//         .then((lastConversation) => {
//           let timezone = lastConversation.activeUsecase.attributes.selectedBranchTimezone;
//           var template_content = fs.readFileSync('public/appointment_template.html','utf8');
//           logger.debug(template_content);
//           logger.debug(timezone);
//           let timeZoneStartTime = moment(appointmentDetails.appointment.start).tz(timezone);
//           let timeZoneEndTime = moment(appointmentDetails.appointment.end).tz(timezone);
//           logger.debug(timeZoneStartTime.format());
//           logger.debug(timeZoneStartTime.format('hh:mm'));
  
  
  
//           template_content = template_content.replace('[SERVICE_NAME]',appointmentDetails.appointment.services[0].name);
//           template_content = template_content.replace('[TIME_SLOT]',timeZoneStartTime.format('hh:mm') + ' - ' + timeZoneEndTime.format('hh:mm'));
//           let ld = timeZoneStartTime.localeData();
//           template_content = template_content.replace('[DATE]',timeZoneStartTime.format('dddd, MMMM Do YYYY'));
//           template_content = template_content.replace('[BRANCH_NAME]',appointmentDetails.appointment.branch.name);
//           template_content = template_content.replace('[ADDRESS]',lastConversation.activeUsecase.attributes.selectedBranchAddressLine1);
//           template_content = template_content.replace('[CITY]',lastConversation.activeUsecase.attributes.selectedBranchCity);
//           template_content = template_content.replace('[COUNTRY]',lastConversation.activeUsecase.attributes.selectedBranchCountry);
//           logger.debug(ld.weekdays(timeZoneStartTime));
  
  
  
  
//           try{
//             fs.writeFileSync('public/appointment_content_'+appointmentDetails.appointment.qpId+'.html',template_content);  
//           }catch(e){
//             logger.debug(e);
//           }
//           logger.debug("Creating Appointment image", appointmentDetails);
  
          
  
  
  
//        // takeScreenshot(facebook.SERVER_URL+'/appointment_content_'+appointmentDetails.appointment.qpId+'.html',appointmentDetails.appointment.qpId);
  
  
//           const nightmare = Nightmare();
//           logger.debug("SERVER_url ",facebook.SERVER_URL);
//           nightmare
//           .viewport(300, 350)
//           .goto(facebook.SERVER_URL+'/appointment_content_'+appointmentDetails.appointment.qpId+'.html')
          
//           .screenshot('public/appointment_content_'+appointmentDetails.appointment.qpId+'.png') 
//           .end()
//           .then(() => {
            
//             logger.debug('screenshot is done');
//             resolve(facebook.SERVER_URL+'/appointment_content_'+appointmentDetails.appointment.qpId+'.png');
//           })
//           .catch((e) => {
//             logger.debug("Error in getting screenshot ",e);
//           })
//         });  
//     });
  
//   }

module.exports.processingApiGatewayJsonResponse = processingApiGatewayJsonResponse;