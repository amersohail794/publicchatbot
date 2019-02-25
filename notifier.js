// import { setTimeout } from 'timers';

const
    https = require('https'),
    request = require('request'),
    axios = require('axios'),
    flow = require('./flow'),
    luis = require('./luis'),
    facebook = require('./facebook'),
    userConversation = require('./user-conversation'),
    serviceMappings = require('./service-mapping.js'),
    orchestra = require('./orchestra'),
    NanoTimer = require('nanotimer'),
    Nightmare = require ('nightmare'),
    moment = require('moment-timezone'),
    //puppeteer = require('puppeteer'),
    globalObjectsFactory = require('./global-objects'),
    userStateManager = require('./user-state'),
    responseProcessor = require('./response-processor'),
    fs = require('fs'),
    logger = require('./winstonlogger')(__filename);

    
const NOTIFIER_TIMESTAMP_FILE = "notifier.json"
const APPOINTMENT_REMINDER = 2; //reminder before number of hours


var process = async () => {
    logger.debug("I am process");
    let timeStampFile = fs.readFileSync(NOTIFIER_TIMESTAMP_FILE);
    let timeStampJson = JSON.parse(timeStampFile);
    logger.debug("last Execution -> " + timeStampJson.lastExecutionDateTime);
    logger.debug(moment(timeStampJson.lastExecutionDateTime).tz('UTC'));

    let fromDateTime = '';
    //if (moment(timeStampJson.lastExecutionDateTime).add(APPOINTMENT_REMINDER,'hours').isBefore(moment())){
    //    fromDateTime = moment().tz('UTC').format('YYYY-MM-DDTHH:mm:ss');
   // }
    //else{
        fromDateTime = moment(timeStampJson.lastExecutionDateTime).add(APPOINTMENT_REMINDER,'hours').tz('UTC').format('YYYY-MM-DDTHH:mm:ss');
    //}

    let toDateTime = moment().tz('UTC').add(APPOINTMENT_REMINDER,'hours').format('YYYY-MM-DDTHH:mm:ss');
    //let toDateTime = moment().tz('UTC').format('YYYY-MM-DDTHH:mm:ss');



    logger.debug('FromDateTime -> ' + fromDateTime)
    logger.debug('ToDateTime -> ' + toDateTime)
    


    let appointmentResults = await orchestra.makeRequest('SEARCH_CALENDAR_APPOINTMENT',new Map(Object.entries({FROM_DATETIME:fromDateTime,TO_DATETIME:toDateTime})),'get');
    logger.debug("appointments -> " + appointmentResults.appointmentList.length);

    //saving timestamp 
    timeStampJson.lastExecutionDateTime = moment().format();
    fs.writeFileSync(NOTIFIER_TIMESTAMP_FILE, JSON.stringify(timeStampJson,undefined,2));


    appointmentResults.appointmentList.forEach( async appointment => {
        if (appointment.customers.length > 0){
            let externalId = appointment.customers[0].externalId;
            let lastConversation = await userConversation.getUserConversation(externalId);
            if (lastConversation){

                let appointmentDate = moment(appointment.start).tz(appointment.branch.timeZone).format('dddd, MMMM Do YYYY');
                let appointmentTime = moment(appointment.start).tz(appointment.branch.timeZone).format('HH:mm');
                facebook.sendTextMessage(externalId,"This is appointment reminder for service '" + appointment.services[0].name + "' .Its due on "+appointmentDate + " at " + appointmentTime);
                facebook.sendTextMessage(externalId,"Here is how you can reach to branch " + lastConversation.activeUsecase.attributes.selectedBranchGoogleMap);

                
            }
        }
    });

}




module.exports.process = process;




