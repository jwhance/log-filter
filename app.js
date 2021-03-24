const AWS = require('aws-sdk');
const argv = require('minimist')(process.argv.slice(2));

// node app.js --loggroup=/aws/lambda/PVOutputFunction-Hance --startdate "2021-03-20 16:25:25" --enddate "2021-03-21 16:59:59" --prefix 2021/03/21
// node app.js --loggroup=/aws/lambda/lambda-001-s-058-e1-00-prod-encore-managedoc-ln --startdate="2021-03-21 00:00:00" --enddate="2021-03-21 23:59:59" --prefix 2021/03/21 --filter=OLS_Email_SLM_20210321120102

const startDate = Date.parse(argv.startdate);
const endDate = Date.parse(argv.enddate);

const cloudwatchlogs = new AWS.CloudWatchLogs({region: 'us-east-1'});

console.error('Reading:', argv.loggroup);

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

const getLogEvents = async (logGroup, logStream, startDate, endDate, nextToken) => {
    var params = {
        logGroupName: logGroup,
        logStreamName: logStream,
        endTime: endDate,
        startFromHead: true,
        startTime: startDate
    };

    if (nextToken) {
        params.nextToken = nextToken;
    }

    const logEvents = await cloudwatchlogs.getLogEvents(params).promise();
    return logEvents;
}

const getAllLogEventsFromStream = async (logGroup, logStream, startDate, endDate) => {
    var events = [];
    var nextToken = null;
    var _events = null;

    do {
        _events = await getLogEvents(logGroup, logStream, startDate, endDate, nextToken);
        if(_events.nextForwardToken != nextToken) {
            nextToken = _events.nextForwardToken;
        } else {
            nextToken = null;
        }

        _events.events.map(e => {
            events.push(e);
        });
    } while (nextToken);

    return events;
}

const getAllLogEvents = async (logGroup, logStreams, startDate, endDate) => {
    let events = [];

    for (let stream =0; stream < logStreams.length; stream++) {
        let _events = await getAllLogEventsFromStream(logGroup, logStreams[stream], startDate, endDate);
        _events.map(e => events.push(e));
    }

    return events;
}

console.error('Getting log streams...');
getAllLogStreams(argv.loggroup, startDate, endDate, argv.prefix)
    .then(async result => {
        console.error('Getting log events...');
        return await getAllLogEvents(argv.loggroup, result, startDate, endDate);
    })
    .then(result => {
        if (argv.filter) {
            console.error('Filtering log events...');
            return result.filter(e => e.message.includes(argv.filter));
        } else {
            return result;
        }
    })
    .then(result => {
        result.map(e => {
            const parts = e.message.split('\t');
            const json = JSON.parse(parts[3]);
            if(false /* json.request */) {
                console.log(json.request.DocumentFileName, json.request.LoanDocumentIdentifier);
            } else {
                console.log(json);
            }
        });
    })
    .catch(error => console.error(error));


