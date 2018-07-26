const
  config = require('config'),
  https = require('https'),
  request = require('request'),
  axios = require('axios');


/*
 * Be sure to setup your config values before running this code. You can
 * set them using environment variables or modifying the config file in /config.
 *
 */

// App Secret can be retrieved from the App Dashboard
const APP_SECRET = (process.env.MESSENGER_APP_SECRET) ?
  process.env.MESSENGER_APP_SECRET :
  config.get('appSecret');

// Arbitrary value used to validate a webhook
const VALIDATION_TOKEN = (process.env.MESSENGER_VALIDATION_TOKEN) ?
  (process.env.MESSENGER_VALIDATION_TOKEN) :
  config.get('validationToken');

// Generate a page access token for your page from the App Dashboard
const PAGE_ACCESS_TOKEN = (process.env.MESSENGER_PAGE_ACCESS_TOKEN) ?
  (process.env.MESSENGER_PAGE_ACCESS_TOKEN) :
  config.get('pageAccessToken');

// URL where the app is running (include protocol). Used to point to scripts and
// assets located at this address.
const SERVER_URL = (process.env.SERVER_URL) ?
  (process.env.SERVER_URL) :
  config.get('serverURL');

if (!(APP_SECRET && VALIDATION_TOKEN && PAGE_ACCESS_TOKEN && SERVER_URL)) {
  console.error("Missing config values");
  process.exit(1);
}

/*
 * Call the Send API. The message data goes in the body. If successful, we'll
 * get the message id in a response
 *
 */
var callSendAPI = (messageData) => {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s",
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });
};


var retrieveUserProfile = (userId) => {
  
  var USER_PROFILE_API_URL = 'https://graph.facebook.com/v2.6/'+userId+'?fields=first_name,last_name,profile_pic&access_token='+PAGE_ACCESS_TOKEN;

  return new Promise((resolve,reject) => {
      axios.get(USER_PROFILE_API_URL).then((response) => {

          console.log("Response from user profile api",JSON.stringify(response.data,undefined,2));
          resolve(response.data);
      }).catch((e) => {
          console.log(`Error in calling user profile api`,e);
          reject('Error in calling user profile api'); 
      });
      
  });

  
}


var callUserProfileAPI = (userId) =>{
  request({
    uri: 'https://graph.facebook.com/v2.6/'+userId+'?fields=first_name,last_name,profile_pic&access_token='+PAGE_ACCESS_TOKEN,
    method: 'GET'

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        console.log("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
      } else {
      console.log("Successfully called Send API for recipient %s",
        recipientId);
      }
    } else {
      console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
    }
  });

};

/*
 * Send a text message using the Send API.
 *
 */
var sendTextMessage = (recipientId, messageText) => {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      metadata: "DEVELOPER_DEFINED_METADATA"
    }
  };

  callSendAPI(messageData);
};

/*
 * Send a message with Quick Reply buttons.
 *
 */
var sendQuickReply = (recipientId,text,response) => {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: text,
      quick_replies: [
        
      ]
    }
  };

  response.options.forEach((reply) => {
    messageData.message.quick_replies.push({
      content_type: reply.content_type,
      title : reply.title,
      payload : reply.payload
    })
  });

  callSendAPI(messageData);
}

// {
//   "content_type":"text",
//   "title":"Action",
//   "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_ACTION"
// },
// {
//   "content_type":"text",
//   "title":"Comedy",
//   "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_COMEDY"
// },
// {
//   "content_type":"text",
//   "title":"Drama",
//   "payload":"DEVELOPER_DEFINED_PAYLOAD_FOR_PICKING_DRAMA"
// }

module.exports.callSendAPI = callSendAPI;
module.exports.sendTextMessage = sendTextMessage;
module.exports.sendQuickReply = sendQuickReply;
module.exports.retrieveUserProfile = retrieveUserProfile;

