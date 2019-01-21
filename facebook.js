const
  config = require('config'),
  https = require('https'),
  request = require('request'),
  axios = require('axios'),
  logger = require('./winstonlogger')(__filename);


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
  return new Promise((resolve,reject) => {
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
          logger.debug("Successfully sent message with id %s to recipient %s",
            messageId, recipientId);
        } else {
        logger.debug("Successfully called Send API for recipient %s",
          recipientId);
        }

        resolve(true);

      } else {

        console.error("Failed calling Send API", response.statusCode, response.statusMessage, body.error);
        reject("Failed calling Send API " + response.statusCode +  response.statusMessage +  body.error);
      }
    });
  });
  
};


var retrieveUserProfile = (userId) => {
  
  var USER_PROFILE_API_URL = 'https://graph.facebook.com/v2.6/'+userId+'?fields=first_name,last_name,profile_pic&access_token='+PAGE_ACCESS_TOKEN;

  return new Promise((resolve,reject) => {
      axios.get(USER_PROFILE_API_URL).then((response) => {

          logger.debug("Response from user profile api",JSON.stringify(response.data,undefined,2));
          resolve(response.data);
      }).catch((e) => {
          logger.debug(`Error in calling user profile api`,e);
          reject('Error in calling user profile api'); 
      });
      
  });

  
}


var callUserProfileAPI = (userId) =>{
  request({
    uri: 'https://graph.facebook.com/v2.6/'+userId+'?fields=first_name,last_name,profile_pic,locale,timezone,gender,&access_token='+PAGE_ACCESS_TOKEN,
    method: 'GET'

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      if (messageId) {
        logger.debug("Successfully sent message with id %s to recipient %s",
          messageId, recipientId);
      } else {
      logger.debug("Successfully called Send API for recipient %s",
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

  return callSendAPI(messageData);
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

  return callSendAPI(messageData);
}

/*
 * Send a Structured Message (Generic Message type) using the Send API.
 *
 */
var sendGenericMessage = (recipientId,list) => {

  logger.debug("sendGenericMessage");
  logger.debug("data -> " + JSON.stringify(list,undefined,2));

  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: []
        }
      }
    }
  };

  list.forEach((item) => {
    let element = {
      title: item.title,
      subtitle: item.subTitle,
      item_url: item.url,
      image_url: (item.imageURL.startsWith('http') ? item.imageURL : SERVER_URL + '/assets/' + item.imageURL) + '?time=43423432432',
      buttons: []    
    }

    item.actions.forEach((action) => {
      let button = {
        type: action.type,
        title: action.title,
        payload: action.payload,
      }
      element.buttons.push(button);
    });

    messageData.message.attachment.payload.elements.push(element);

  });

  logger.debug("facebook compatible data -> " + JSON.stringify(messageData,undefined,2));

  // {
  //   title: "touch",
  //   subtitle: "Your Hands, Now in VR",
  //   item_url: "https://www.oculus.com/en-us/touch/",
  //   image_url: SERVER_URL + "/assets/touch.png",
  //   buttons: [{
  //     type: "web_url",
  //     url: "https://www.oculus.com/en-us/touch/",
  //     title: "Open Web URL"
  //   }, {
  //     type: "postback",
  //     title: "Call Postback",
  //     payload: "Payload for second bubble",
  //   }]
  // }

  return callSendAPI(messageData);
}

/*
 * Send an image using the Send API.
 *
 */
function sendImageMessage(recipientId,imageName) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "image",
        payload: {
          url: imageName
        }
      }
    }
  };

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
module.exports.sendGenericMessage = sendGenericMessage;
module.exports.sendImageMessage = sendImageMessage;
module.exports.SERVER_URL = SERVER_URL;

