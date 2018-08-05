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

var saveUserConversation = ((userId,intent,attributesMap) => {

  return new Promise((resolve,reject) => {
    fetchAllConversations().then((conversations) => {

      console.log("Total conversations",conversations.length);
      let existingConversations = conversations.filter((conversation) => conversation.userId === userId);
      console.log("Existing Conversations ",existingConversations.length);
      if (existingConversations.length === 0){
        conversations.push({userId : userId, lastIntent : intent, lastIntentDateTime: moment().format()});
        conversations[conversations.length-1].attributes = {}; 
        if (attributesMap != undefined){
         for (let [attributeKey, attributeValue] of attributesMap.entries()) {
           conversations[conversations.length-1].attributes[attributeKey] = attributeValue;
         }
        }
      }
      else{
        existingConversations[0].lastIntent = intent;
        existingConversations[0].lastIntentDateTime = moment().format();
   
        if (attributesMap != undefined){
         for (let [attributeKey, attributeValue] of attributesMap.entries()) {
          existingConversations[0].attributes[attributeKey] = attributeValue;
         }
        }   
   
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
