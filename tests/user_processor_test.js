const requestProcessor = require('../request-processor');

//requestProcessor.process('Hi');

var params = {
    utterance : 'I want to renew my family visa',
    userId : '1697938176985929'
}

requestProcessor.process(params);