const
    facebook = require('./facebook'),
    userConversation = require('./user-conversation'),
    apiGatewayProcessor = require('./api-gateway-processor');

var processingTextResponse = ((processData) => {

    return new Promise((resolve,reject) => {
      var txt = processData.actionCurrentResponse.text;
      txt = txt.replace('{{user_first_name}}',processData.profile.first_name);
      if (processData.entityMap != undefined){
        for (let [entityType, entity] of processData.entityMap.entries()) {
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
  
      userConversation.getUserConversation(processData.requestParams.userId)
        .then((conversation) => {
  
          if (conversation != undefined && conversation.activeUsecase != undefined){
            for (let property in conversation.activeUsecase.attributes) {
              if (conversation.activeUsecase.attributes.hasOwnProperty(property)) {
                console.log('property -> ' + property); 
                txt = txt.replace('{{UserSession.'+property+'}}',conversation.activeUsecase.attributes[property]);
              }
            }
          }
          
  
          facebook.sendTextMessage(processData.requestParams.userId,txt)
            .then(_ => resolve(true))
            .catch(() => reject("Could not send text response"));
  
            
      });
  
      
      
    });
  
  
    
  });
  
  var processingQuickReplyResponse = ((processData) => {
      
      return new Promise((resolve,reject) => {
        var txt = processData.actionCurrentResponse.text;
        txt = txt.replace('{{user_first_name}}',processData.profile.first_name);
        if (processData.entityMap != undefined){
          for (let [entityType, entity] of processData.entityMap.entries()) {
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
  
        userConversation.getUserConversation(processData.requestParams.userId)
          .then((conversation) => {
  
            if (conversation.activeUsecase != undefined){
              for (let property in conversation.activeUsecase.attributes) {
                if (conversation.activeUsecase.attributes.hasOwnProperty(property)) {
                  console.log('property -> ' + property); 
                  txt = txt.replace('{{UserSession.'+property+'}}',conversation.activeUsecase.attributes[property]);
                }
              }
            }
            
  
            facebook.sendQuickReply(processData.requestParams.userId,txt,processData.actionCurrentResponse)
            .then(_ => resolve(true))
            .catch(() => reject("Could not send quick reply response"));
  
            
          });
  
  
        
      });
      
  });
  
  
  
  // async function takeScreenshot(url,id) {
  //   const browser = await puppeteer.launch();
  //   const page = await browser.newPage();
    
  //   await page.goto(url);
  //   await page.screenshot({ path: 'public/appointment_content_'+id+'.png' });
    
  //   browser.close();
  // }
  
  var process = ((processData) => {
    console.log("Response Selected",JSON.stringify(processData.actionCurrentResponse,undefined,2));
    return new Promise((resolve) => {
      if (processData.actionCurrentResponse.responseType === 'Text'){
        console.log("ResponseType ",processData.actionCurrentResponse.responseType);
        processingTextResponse(processData)
          .then(_ => resolve());
        
      }
      else if (processData.actionCurrentResponse.responseType === 'QuickReply'){
        console.log("ResponseType ",processData.actionCurrentResponse.responseType);
        processingQuickReplyResponse(processData)
          .then(_ => resolve());
      }
      else if (processData.actionCurrentResponse.responseType === 'ApiGatewayJson'){
        console.log("ResponseType ",processData.actionCurrentResponse.responseType);
        apiGatewayProcessor.processingApiGatewayJsonResponse(processData)
          .then((response) => resolve(response));
       
      }
    //   else if (processData.actionCurrentResponse.responseType === 'Internal'){
    //     console.log("ResponseType ",processData.actionCurrentResponse.responseType);
        
    //     let p = {
    //       userId : processData.requestParams.userId,
    //       utterance : processData.actionCurrentResponse.responseType + '.' + processData.actionCurrentResponse.text
    //     }
    //     process(p).then(_ => resolve());
    //   }
      else if (['ServiceSelection','BranchSelection','DateTimeSelection','AppointmentConfirmation'].includes(processData.actionCurrentResponse.responseType)){
        console.log(`no need to do anything for ${processData.actionCurrentResponse.responseType} as it will be handled by CollectingUserState`)
        //no need to do anything as it will be handled by CollectingUserState
        resolve();
      }
      else{
        facebook.sendTextMessage(requestParams.userId,"Sorry no response is defined yet");
         resolve();
      }
    }); //end of Promise
  
   
    
    
  });

  module.exports.process = process;