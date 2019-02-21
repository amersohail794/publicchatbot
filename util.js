
var timeToSecond = (timeInString) => {
   
    let timeParts = timeInString.split(':');
    let seconds = timeParts[0] * 3600; //hour to seconds
    if (timeParts.length > 1)
        seconds += timeParts[1] * 60; //min to sec
        
    if (timeParts.length > 2)
        seconds += timeParts[2] * 1; //multiplied by 1 to convert to int
        
    
    return seconds;
    
};

var timeToMinutes = (timeInString) => {
   
    let timeParts = timeInString.split(':');
    let minutes = timeParts[0] * 60; //hour to mins
    if (timeParts.length > 1)
        minutes += timeParts[1] * 1;

    return minutes;
    
};

var separateDateTime = (dateTimeInString) => {
    let valueParts = dateTimeInString.split(' '); //2017-05-02 08:00:00
    return valueParts;
};

var timeInhhmm = (timeInString) => {
    let timeParts = timeInString.split(':');
    let timeFormat = timeParts[0] + ':';
    if (timeParts.length > 1)
        timeFormat += timeParts[1];
    else
        timeFormat += "00";

    return timeFormat;
};

var isTimeInRange = (timeToCheck,timeRange) => {
    let filterParts = timeRange.split('-');
    let startFilter = timeToSecond(filterParts[0]);
    let endFilter = timeToSecond(filterParts[1]);
    let timeInRequest = timeToSecond(timeToCheck);
    if (timeInRequest < startFilter || timeInRequest > endFilter)
        return false;
    return true;
};

module.exports.timeToSecond = timeToSecond;
module.exports.timeToMinutes = timeToMinutes;
module.exports.separateDateTime = separateDateTime;
module.exports.timeInhhmm = timeInhhmm;
module.exports.isTimeInRange = isTimeInRange;