const axios = require('axios');

const properties = {
    ORCHESTRA_URL :'http://192.168.98.19:8080/',
    API_GATEWAY_URL : 'http://192.168.98.19:9150/',
    MOBILE_USER_ID : 'd0516eee-a32d-11e5-bf7f-feff819cdc9f',
    CALENDAR_USER_ID: 'c7a1331a-32d-11e5-bf7f-feff819acdc9f',
    GEO_BRANCHES : 'geo/services/{{SERVICE_ID}}/nearestbranches?latitude={{LATITUDE}}&longitude={{LONGITUDE}}&maxNrOfBranches=4',
    SERVICES : 'rest/calendar-backend/api/v1/services',
    DATES : 'rest/calendar-backend/api/v2/branches/{{BRANCH_PUBLIC_ID}}/dates;servicePublicId={{SERVICE_PUBLIC_ID}}',
    TIMES : 'calendar-backend/public/api/v2/branches/{{BRANCH_PUBLIC_ID}}/dates/{{DATE}}/times;servicePublicId={{SERVICE_PUBLIC_ID}}',
    BRANCH_PUBLIC_DETAIL: 'rest/calendar-backend/api/v1/branches/{{BRANCH_INTERNAL_ID}}',
    CALENDAR_USER : Buffer.from("superadmin:ulan").toString('base64'),
    APPOINTMENT_BOOKING : 'calendar-backend/public/api/v2/branches/{{BRANCH_PUBLIC_ID}}/dates/{{DATE}}/times/{{TIME}}/book',
    APPOINTMENT_DETAIL: 'rest/calendar-backend/api/v1/appointments/publicid/{{APPOINTMENT_PUBLIC_ID}}'
}
//geo/services/7/nearestbranches?latitude=25.077265790923&longitude=55.150239192244&maxNrOfBranches=4
// http://127.0.0.1:9090/rest/calendar-backend/api/v1/branches/1

var connectionDetails = (dataType) => {
    let url = '';
    let userId = '';
    switch(dataType){
        case 'BRANCHES':{
            url = properties.API_GATEWAY_URL + properties.GEO_BRANCHES;
            userId = properties.MOBILE_USER_ID;
            break;
        }
        case 'BRANCH_PUBLIC_DETAIL':{
            url = properties.API_GATEWAY_URL + properties.BRANCH_PUBLIC_DETAIL;
            userId = properties.CALENDAR_USER_ID;
            break;
        }
        case 'AVAILABLE_TIMES':{
            url = properties.ORCHESTRA_URL + properties.TIMES;
            userId = properties.CALENDAR_USER_ID;
            break;
        }
        case 'CONFIRM_APPOINTMENT':{
            url = properties.ORCHESTRA_URL + properties.APPOINTMENT_BOOKING;
            userId = properties.CALENDAR_USER_ID;
            break;
        }
        case 'APPOINTMENT_DETAIL':{
            url = properties.API_GATEWAY_URL + properties.APPOINTMENT_DETAIL;
            userId = properties.CALENDAR_USER_ID;
            break;
        }
    }
    return {url : url, userId : userId};
}

var makeRequest = (dataType,paramMap,requestType,data) => {

    console.log('Data -> ',JSON.stringify(data,undefined,2));

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
            headers : {'auth-token' : details.userId, 'Referer':properties.API_GATEWAY_URL, 'Authorization': 'Basic ' + properties.CALENDAR_USER}
          }).then((response) => {

            console.log("Response from orchestra",JSON.stringify(response.data,undefined,2));
            
            resolve(response.data);
        }).catch((e) => {
            console.log(`Error in calling orchestra`,e);
            reject('Error in calling orchestra'); 
        });
        
    });

    
}

module.exports.makeRequest = makeRequest;