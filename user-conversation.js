const fs = require('fs');
const moment = require('moment');

const fileName = 'conversations.json';

var fetchAllConversations = () => {
  try {
    var conversations = fs.readFileSync(fileName);
    return JSON.parse(conversations);
  } catch (e) {
    return [];
  }
};

var getUserConversation = (userId) => {
  var conversations = fetchAllConversations();
  var existingConversation = conversations.filter((conversation) => conversation.userId === userId);
  console.log("ExistingConversations",existingConversation.length);
  if (existingConversation.length ===0)
    return;
  else
    return existingConversation[0];
};

var saveUserConversation = ((userId,intent,attributesMap) => {
   var conversations = fetchAllConversations();
   console.log("Total conversations",conversations.length);
   var existingConversation = conversations.filter((conversation) => conversation.userId === userId);
   console.log("Existing Conversations ",existingConversation.length);
   if (existingConversation.length === 0){
     conversations.push({userId : userId, lastIntent : intent, lastIntentDateTime: moment().format()});
     conversations[conversations.length-1].attributes = {}; 
     if (attributesMap != undefined){
      for (let [attributeKey, attributeValue] of attributesMap.entries()) {
        conversations[conversations.length-1].attributes[attributeKey] = attributeValue;
      }
     }
   }
   else{
     existingConversation[0].lastIntent = intent;
     existingConversation[0].lastIntentDateTime = moment().format();

     if (attributesMap != undefined){
      for (let [attributeKey, attributeValue] of attributesMap.entries()) {
        existingConversation[0].attributes[attributeKey] = attributeValue;
      }
     }   

   }
   try{
      saveConversations(conversations);
      console.log("conversations saved");
   }catch(e){
     console.log("Error in saving conversation",e);
   }
   
});

var saveConversations = (conversations) => {
  fs.writeFileSync(fileName, JSON.stringify(conversations,undefined,2));
};

module.exports.saveUserConversation = saveUserConversation;
module.exports.getUserConversation = getUserConversation;
