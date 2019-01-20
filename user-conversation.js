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

var getNextStep = ((userId) => {
  console.log("Getting Next Step for User -> ",userId);
  return new Promise((resolve) => {
    fetchAllConversations().then((conversations) => {
      let existingConversations = conversations.filter((conversation) => conversation.userId === userId);
      
      let userConversation = null;
      if (existingConversations.length === 0){
        userConversation = {userId : userId, lastIntent : intentFlow.intent, lastIntentDateTime: moment().format()};
        conversations.push(userConversation);
      }
      else{
        userConversation = existingConversations[0];
      }
      let nextStep = null;
      if (userConversation.activeUsecase !== undefined && userConversation.activeUsecase.pendingSteps.length > 0){
        nextStep = userConversation.activeUsecase.name + '.' +userConversation.activeUsecase.pendingSteps.splice(0,1);
      }

      resolve(nextStep);
    });
  })

});

var moveActiveUsecaseToInprocess = ((userId) => {
  console.log("moving active use case to in process -> ",userId); //also move pending use cases to pending use case list

  return new Promise((resolve) => {
    fetchAllConversations().then((conversations) => {
      let existingConversations = conversations.filter((conversation) => conversation.userId === userId);
      
      let userConversation = null;
      if (existingConversations.length > 0){
        userConversation = existingConversations[0];
        if (userConversation.inProcessUsecases === undefined){
          console.log("there is no inprocess use cases");
          userConversation.inProcessUsecases = [];
        }

        if (userConversation.activeUsecase != undefined){
          console.log("activeUsecase is going to push to inprocess use cases");
          userConversation.inProcessUsecases.push(userConversation.activeUsecase);
          userConversation.activeUsecase = null;
        }
        
      }
      
      saveConversations(conversations);

      resolve(true);
    });
  })


});

var saveUserConversation = ((userId,intentFlow,attributesMap) => {

  return new Promise((resolve,reject) => {
    fetchAllConversations().then((conversations) => {
      //Step 1 - Fetch User Conversation otherwise create one
      console.log("Total conversations",conversations.length);
      let existingConversations = conversations.filter((conversation) => conversation.userId === userId);
      console.log("Existing Conversations ",existingConversations.length);
      let userConversation = null;
      if (existingConversations.length === 0){
        userConversation = {userId : userId, lastIntent : intentFlow.intent, lastIntentDateTime: moment().format()};
        conversations.push(userConversation);
      }
      else{
        userConversation = existingConversations[0];
      }

      //Step 2: Store intent's name and timestamp

      userConversation.lastIntent = intentFlow.intent;
      userConversation.lastIntentDateTime = moment().format();

      //Step 3 - check if there is use case for intent
      let intentWithUsecase = false;
      if (intentFlow.usecase !== undefined)
        intentWithUsecase = true;

      //Step 4 - check if there is already some activeUsecase or no
      let activeUsecaseFound = false;
      if (userConversation.activeUsecase !== undefined)
        activeUsecaseFound = true;

      //Step 5 if intent is with usecase and there is no active usecase, then create activeUsecase
      if (intentWithUsecase && !activeUsecaseFound){
        userConversation.activeUsecase = {};
        userConversation.activeUsecase.attributes = {};
        userConversation.activeUsecase.name = intentFlow.usecase;

        userConversation.activeUsecase.pendingSteps = [];
        userConversation.activeUsecase.pendingSteps = intentFlow.stepsToBeFollowed.slice();

        userConversation.activeUsecase.followingUsecase = [];
        userConversation.activeUsecase.followingUsecase = intentFlow.followingUsecase.slice();

        userConversation.activeUsecase.completedSteps = [];

        
      }

      //Step 5a if intent is with usecase which differs from already activeUsecase, then archive the existing one and create new one
      if (intentWithUsecase && activeUsecaseFound && intentFlow.usecase !== userConversation.activeUsecase.name){
        if (userConversation.archiveUsecases === undefined)
            userConversation.archiveUsecases = [];
          
        userConversation.archiveUsecases.push(userConversation.activeUsecase);
        userConversation.activeUsecase = {};
        userConversation.activeUsecase.attributes = {};
        userConversation.activeUsecase.name = intentFlow.usecase;

        userConversation.activeUsecase.pendingSteps = [];
        userConversation.activeUsecase.pendingSteps = intentFlow.stepsToBeFollowed.slice();

        userConversation.activeUsecase.followingUsecase = [];
        userConversation.activeUsecase.followingUsecase = intentFlow.followingUsecase.slice();

        userConversation.activeUsecase.completedSteps = [];
      }
       

      //Step 6 - If intent is with usecase and there is same activeUsecase but step varies,
      // then put the currentStep as completed, pull new step from pendingSteps and make it active
      if (intentWithUsecase && activeUsecaseFound && intentFlow.stepName !== userConversation.activeUsecase.currentStep){
            
            if (userConversation.activeUsecase.currentStep != undefined)
                userConversation.activeUsecase.completedSteps.push(userConversation.activeUsecase.currentStep);

            if (userConversation.activeUsecase.pendingSteps.length > 0){
            userConversation.activeUsecase.currentStep = userConversation.activeUsecase.pendingSteps[0];
            userConversation.activeUsecase.pendingSteps.splice(0,1);
            }
            else
            userConversation.activeUsecase.currentStep = undefined;
        
        
      }
      
      //Step 6a - if intent is with usecase and there is activeUsecae but no current step,
      // then pull new step from pending steps and make it active
      if (intentWithUsecase && activeUsecaseFound && userConversation.activeUsecase.currentStep === undefined){
        if (userConversation.activeUsecase.pendingSteps.length > 0){
          userConversation.activeUsecase.currentStep = userConversation.activeUsecase.pendingSteps[0];
          userConversation.activeUsecase.pendingSteps.splice(0,1);
        }
        else
          userConversation.activeUsecase.currentStep = undefined;
        
      }

      //Step 7 - if there is activeUsecase, then copy attributes to that activeUsecase
      if (activeUsecaseFound && attributesMap !== undefined){
        
        for (let [attributeKey, attributeValue] of attributesMap.entries()) {
            console.log("Setting user attributes -> " + attributeKey + "  -> " + attributeValue);
          userConversation.activeUsecase.attributes[attributeKey] = attributeValue;
        }
      }


      //Step 8 - Save Conversation
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

var clearUserConversation = () => {

   return saveConversations([]);
  
    
  };

module.exports.saveUserConversation = saveUserConversation;
module.exports.getUserConversation = getUserConversation;
module.exports.getNextStep = getNextStep;
module.exports.moveActiveUsecaseToInprocess = moveActiveUsecaseToInprocess;
module.exports.clearUserConversation = clearUserConversation;
