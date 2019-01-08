var processingApiGatewayJsonResponse =  ( (processData) => {
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
  
            branchData.actions.push({type : 'postback', title : 'Select', payload : intentFlow.usecase + '.' + intentFlow.stepName + '.selectedLocation.'+branch.id});
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
  
      
    }else if (response.processingFunction ==='SearchCustomerFromOrchestra'){
      console.log("searching Customer... ");
  
      return new Promise((resolve,reject) => {
        
          return orchestra.makeRequest('SEARCH_CUSTOMER',new Map(Object.entries(
            {EXTERNAL_ID:params.userId}
            )),'get',postData)
            .then((customerDetails) => {
  
              console.log("Total Customers Found -> ",customerDetails.totalResults);
  
              if (customerDetails.totalResults === 0){
                resolve();
                return; 
              }
  
              let customerInfo = customerDetails.customerList[0]; 
              resolve(customerInfo);
              //facebook.sendTextMessage("Your appointment is confirmed wtih refernce id " + appointmentDetails.appointment.qpId) ;
              
        });
  
      });
  
      
    }else if (response.processingFunction ==='SendAppointmentDetail'){
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
  
          
  
  
  
       // takeScreenshot(facebook.SERVER_URL+'/appointment_content_'+appointmentDetails.appointment.qpId+'.html',appointmentDetails.appointment.qpId);
  
  
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
          .catch((e) => {
            console.log("Error in getting screenshot ",e);
          })
        });  
    });
  
  }

module.exports.processingApiGatewayJsonResponse = processingApiGatewayJsonResponse;