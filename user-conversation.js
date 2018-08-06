const fs = require('fs');
const moment = require('moment');

const fileName = 'conversations.json';

var fetchAllConversations = () => {

  return new Promise((resolve,reject) => {
    try {
      var conversations = fs.readFileSync(fileName);
      resolve(JSON.parse(conversations));
    } catch (e) {
      console.log(e);
      resolve([]);
    }
  });


  
};

var getUserConversation = (userId) => {

  return new Promise((resolve,reject) => {
 
    fetchAllConversations().then((conversations) => {
      let existingConversations = conversations.filter((conversation) => conversation.userId === userId);
      console.log("ExistingConversations",existingConversations.length);
      resolve(existingConversations.length > 0 ? existingConversations[0] : undefined);

    })


  });

 
};

var saveUserConversation = ((userId,intentFlow,attributesMap) => {

  return new Promise((resolve,reject) => {
    fetchAllConversations().then((conversations) => {

      console.log("Total conversations",conversations.length);
      let existingConversations = conversations.filter((conversation) => conversation.userId === userId);
      console.log("Existing Conversations ",existingConversations.length);
      if (existingConversations.length === 0){
        conversations.push({userId : userId, lastIntent : intentFlow.intent, lastIntentDateTime: moment().format()});
        //active use cases functionality
        if (intentFlow.usecase !== undefined){
          conversations[conversatiosn.length-1].activeUsecase = {};
          conversations[conversatiosn.length-1].activeUsecase.name = intentFlow.usecase;
          conversations[conversatiosn.length-1].activeUsecase.lastIntent = conversations[conversations.length -1].lastIntent;
          conversations[conversatiosn.length-1].activeUsecase.lastIntentDateTime = conversations[conversations.length -1].lastIntentDateTime;
          conversations[conversations.length-1].activeUsecase.attributes = {}; 
          if (attributesMap != undefined){
            for (let [attributeKey, attributeValue] of attributesMap.entries()) {
              conversations[conversations.length-1].activeUsecase.attributes[attributeKey] = attributeValue;
            }
          }
        }
        
      }
      else{
        existingConversations[0].lastIntent = intentFlow.intent;
        existingConversations[0].lastIntentDateTime = moment().format();
        if (intentFlow.usecase !== undefined){
          if (existingConversations[0].activeUsecase !== undefined){
            if (existingConversations[0].activeUsecase.name !== intentFlow.usecase){
              //TODO: implement if intent is not from active usecase
              if (existingConversations[0].archiveUsecases === undefined)
                existingConversations[0].archiveUsecases = [];
              
              existingConversations[0].archiveUsecases.push(existingConversations[0].activeUsecase);
              existingConversations[0].archiveUsecases[existingConversations[0].archiveUsecases.length - 1].status = "INCOMPLETE";
              existingConversations[0].activeUsecase = {};
            }
          }
          else{
            existingConversations[0].activeUsecase = {};
          }
          
            

          
          existingConversations[0].activeUsecase.name = intentFlow.usecase;        
          existingConversations[0].activeUsecase.lastIntent = existingConversations[0].lastIntent;
          existingConversations[0].activeUsecase.lastIntentDateTime = existingConversations[0].lastIntentDateTime;
          if (attributesMap != undefined){

            if (existingConversations[0].activeUsecase.attributes === undefined)
              existingConversations[0].activeUsecase.attributes = {};

            for (let [attributeKey, attributeValue] of attributesMap.entries()) {
              existingConversations[0].activeUsecase.attributes[attributeKey] = attributeValue;
            }
          }

          
        }else{
          console.log("intentflow does not have usecase");
        }
        // if (attributesMap != undefined){
        //  for (let [attributeKey, attributeValue] of attributesMap.entries()) {
        //   existingConversations[0].attributes[attributeKey] = attributeValue;
        //  }
        // }   
   
      }

      saveConversations(conversations).then( (response) => resolve(response));
      

    });
  })
   
});

var saveConversations = (conversations) => {

  return new Promise((resolve) => {
    fs.writeFileSync(fileName, JSON.stringify(conversations,undefined,2));
    resolve(true);
  })

  
};

module.exports.saveUserConversation = saveUserConversation;
module.exports.getUserConversation = getUserConversation;
