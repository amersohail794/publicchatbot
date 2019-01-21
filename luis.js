const axios = require('axios');
const  logger = require('./winstonlogger')(__filename);

const LUIS_URL = 'https://westus.api.cognitive.microsoft.com/luis/v2.0/apps/a0561b18-f0fe-4388-8dd9-a68b816afccf?subscription-key=6281bad971214a52adc4b4c477a71b4b&verbose=true&timezoneOffset=0&q=';

var query = (utterance) => {
    var messageQueryString = encodeURIComponent(utterance);

    return new Promise((resolve,reject) => {
        axios.get(LUIS_URL+messageQueryString).then((response) => {

            logger.debug("Response from LUIS",JSON.stringify(response.data,undefined,2));
            var entityMap = new Map();
            response.data.entities.forEach((e) =>{
                if (entityMap.has(e.type) && entityMap.get(e.type).score < e.score){
                    
                    entityMap.set(e.type,e);

                    logger.debug("entity is updated in entityMap",e.type,e);
                }else if (!entityMap.has(e.type)){
                    entityMap.set(e.type,e);
                    logger.debug("entity is set in entityMap ",e.type,e);
                    
                }
                else{
                    logger.debug("I didn't matched");
                }
            });
            logger.debug("entityMap Size ",entityMap.size);
            logger.debug("entityMap ",JSON.stringify(entityMap,undefined,2));
            for (let [key, value] of entityMap.entries()) {
                logger.debug(key, value);
            }
            resolve({intent : response.data.topScoringIntent.intent, entityMap : entityMap});
        }).catch((e) => {
            logger.debug(`Error in calling LUIS`,e);
            reject('Error in calling LUIS'); 
        });
        
    });

    
}

module.exports.query = query;