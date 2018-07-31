const axios = require('axios');

const properties = {
    API_GATEWAY_URL : 'http://127.0.0.1:9090/',
    MOBILE_USER_ID : 'd0516eee-a32d-11e5-bf7f-feff819cdc9f',
    GEO_BRANCHES : 'geo/services/{{SERVICE_ID}}/nearestbranches?latitude={{LATITUDE}}&longitude={{LONGITUDE}}&maxNrOfBranches=4',
    SERVICES : 'rest/calendar-backend/api/v1/services'
}
//geo/services/7/nearestbranches?latitude=25.077265790923&longitude=55.150239192244&maxNrOfBranches=4

var connectionDetails = (dataType) => {
    let url = '';
    let userId = '';
    switch(dataType){
        case 'BRANCHES':{
            url = properties.API_GATEWAY_URL + properties.GEO_BRANCHES;
            userId = properties.MOBILE_USER_ID;
            break;
        }
    }
    return {url : url, userId : userId};
}

var retrieveData = (dataType,paramMap,requestType,data) => {

    //Step 1 - construct url
    var details = connectionDetails(dataType);

    console.log("Details -> " + JSON.stringify(details,undefined,2));
    
    //Step 2 - replace parameters with values in url
    for (var [key, value] of paramMap.entries()) {
        console.log(`Key -> ${key}, value -> ${value}`);
        details.url = details.url.replace('{{'+ key+'}}',value);
    }

    console.log("Details -> " + JSON.stringify(details,undefined,2));
    

    //Step 3 - Create Promise and call the URL
    return new Promise((resolve,reject) => {

        axios({
            method: requestType,
            url: details.url,
            data: data,
            headers : {'auth-token' : details.userId, 'Referer':properties.API_GATEWAY_URL}
          }).then((response) => {

            console.log("Response from orchestra",JSON.stringify(response.data,undefined,2));
            
            resolve(response.data);
        }).catch((e) => {
            console.log(`Error in calling orchestra`,e);
            reject('Error in calling orchestra'); 
        });
        
    });

    
}

module.exports.retrieveData = retrieveData;