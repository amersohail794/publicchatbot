const axios = require('axios');

const proprties = {
    API_GATEWAY_URL : 'http://192.168.98.66:9090/',
    AP_GATEWAY_MEDICAL_CENTER_USER_ID : '',
    GEO_BRANCHES : 'geo/services/{{SERVICE_ID}}/nearestbranches?latitude={{LATITUDE}}&longitude={{LONGITUDE}}&maxNrOfBranches=4',
    SERVICES : 'rest/calendar-backend/api/v1/services'
}


var doAction = (userId,query,paramMap) => {
    var messageQueryString = encodeURIComponent(utterance);

    return new Promise((resolve,reject) => {
        axios.get(LUIS_URL+messageQueryString).then((response) => {

            console.log("Response from LUIS",JSON.stringify(response.data,undefined,2));
            var entityMap = new Map();
            response.data.entities.forEach((e) =>{
                if (entityMap.has(e.type) && entityMap.get(e.type).score < e.score){
                    entityMap.set(e.type,e);

                    console.log("entity is updated in entityMap",e.type,e);
                }else if (!entityMap.has(e.type)){
                    entityMap.set(e.type,e);
                    console.log("entity is set in entityMap ",e.type,e);
                    
                }
                else{
                    console.log("I didn't matched");
                }
            });
            console.log("entityMap Size ",entityMap.size);
            console.log("entityMap ",JSON.stringify(entityMap,undefined,2));
            for (let [key, value] of entityMap.entries()) {
                console.log(key, value);
            }
            resolve({intent : response.data.topScoringIntent.intent, entityMap : entityMap});
        }).catch((e) => {
            console.log(`Error in calling LUIS`,e);
            reject('Error in calling LUIS'); 
        });
        
    });

    
}

module.exports.query = query;