const requestProcessor = require('../request-processor');

//requestProcessor.process('Hi');

// var params = {
//     utterance : 'I want to renew my family visa',
//     userId : '1697938176985929'
// }

// requestProcessor.process(params);

// var param2 = {
//     userId: "1697938176985929",
//     timeOfMessage: 1533025592399,
//     attachments: [
//       {
//         title: "Oaks Hotels",
//         url: "https://l.facebook.com/l.php?u=https%3A%2F%2Fwww.bing.com%2Fmaps%2Fdefault.aspx%3Fv%3D2%26pc%3DFACEBK%26mid%3D8100%26where1%3DJumeirah%2BLake%2BTowers%252C%2B31303%2BDubai%252C%2BUnited%2BArab%2BEmirates%26FORM%3DFBKPL1%26mkt%3Den-US&h=AT3w8yExCRd5wcBZw3wD-2qLVcd-PRac2P8Hq3EFc12BwayflPX_Rhhc3y4xSvkfcg51MGNUsxq4n8s_B7XijP2JoUx4DK9LqEIr0-o-KdctZGdi0QU20tJvKv4ohw0ymfAK5imrAlLd&s=1",
//         type: "location",
//         payload: {
//           coordinates: {
//             lat: 25.077265790923,
//             long: 55.150239192244
//           }
//         }
//       }
//     ],
//     messageId: "MJedXoPnfGg-HilMX7Wp6MspnxwpuQwgIgDJOmopljc_aW9W0IhtOOOrd2lpCFzx8VpzdRUp4v_G5m1UeHJbrg"
//   }

//   requestProcessor.processMessageAttachment(param2);


// var param2 = {
//     userId: "1697938176985929",
//     utterance: 'tomorrow at 2pm'
// }

// requestProcessor.process(param2);

var p3 = {
    userId: "1697938176985929",
    timeOfMessage: 1533551973516,
    utterance: "Confirm",
    quickReply: {
      payload: "RenewVisa.AppointmentForMedical.ConfirmAppointment"
    },
    messageId: "WrLkoxlP8mbkZLn2Ga0eacspnxwpuQwgIgDJOmopljfSqqWApJXuKSvlcA2d5ygtryPX12Ig6-ru8i4lJcL8ow"
  }

requestProcessor.processQuickReply(p3);