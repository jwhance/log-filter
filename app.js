const AWS = require('aws-sdk');
const argv = require('minimist')(process.argv.slice(2));

// node app.js --loggroup=/aws/lambda/PVOutputFunction-Hance --startdate "2021-03-20 16:25:25" --enddate "2021-03-21 16:59:59" --prefix 2021/03/21

const startDate = Date.parse(argv.startdate);
const endDate = Date.parse(argv.enddate);

const cloudwatchlogs = new AWS.CloudWatchLogs({region: 'us-east-1'});

console.log(argv.loggroup);

const getLogStreams = async (logGroupName, _startDate, _endDate, prefix, nextToken) => {
    var params = {
        logGroupName: logGroupName,
    };

    if (prefix) {
        params.logStreamNamePrefix = prefix;
    }

    if (nextToken) {
        params.nextToken = nextToken;
    }

    const logStreams = await cloudwatchlogs.describeLogStreams(params).promise();
    return [
        logStreams.logStreams.filter(stream => stream.firstEventTimestamp >= _startDate && stream.lastEventTimestamp <= _endDate), 
        logStreams.nextToken
    ];
}

const getAllLogStreams = async (logGroup, startDate, endDate, prefix) => {
    let streams = [];
    let nextToken = null;
    let _streams = null;

    do {
        _streams = await getLogStreams(logGroup, startDate, endDate, prefix, nextToken);
        _streams[0].map(s => streams.push(s.logStreamName));
        nextToken = _streams[1];
        
    } while (_streams[1]);

    return streams;
}

const getLogEvents = async (logGroup, logStream, startDate, endDate) => {
    var params = {
        logGroupName: 'STRING_VALUE', /* required */
        logStreamName: 'STRING_VALUE', /* required */
        endTime: 'NUMBER_VALUE',
        limit: 'NUMBER_VALUE',
        nextToken: 'STRING_VALUE',
        startFromHead: true || false,
        startTime: 'NUMBER_VALUE'
      };

      const logEvents = await cloudwatchlogs.getLogEvents(params).promise();
      return logEvents;
}

console.log('Reading log streams...');
getAllLogStreams(argv.loggroup, startDate, endDate, argv.prefix)
    .then(result => {
        
    })
    .then(result => {
        console.log(result);
        console.log(startDate, endDate);
    })
    .catch(error => console.error(error));


