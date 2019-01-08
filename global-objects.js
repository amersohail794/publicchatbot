var getProcesDataObj = function(){
    return {
        requestParams: undefined,
        entityMap : undefined,
        intentFlow : undefined,
        profile : undefined,
        selectedAction : undefined,
        actionCurrentResponse : undefined, //under execution response against selected action.
        responseExecutionOutput : undefined //output of the action taken by selected action response
    }
}

var getRequestParam = function(){
    return   {
        userId : undefined,
        timeOfMessage : undefined,
        utterance : undefined,
        attachments : undefined,
        quickReply : undefined,
        postback : undefined,
        appId: undefined,
        messageId : undefined 
    }
}

module.exports.getProcesDataObj = getProcesDataObj;
module.exports.getRequestParam = getRequestParam;