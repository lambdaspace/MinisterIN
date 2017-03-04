/*jshint esnext: true */

// Include needed node.js modules
var http = require('http');
var request = require('request');
var Twitter = require('twitter');
var irc = require('irc');
var bot = require('./ircbot.js');
var gh_webhook = require('github-webhook-handler');
var program = require('commander');
var mqtt = require('mqtt');
var fs = require('fs');
var cron = require('node-schedule');
var mattermost = require('node-mattermost');
require('datejs');

var numOfHackers = -1;
var spaceOpen = false;

program
  .version('1.3.1')
  .usage('space=[open/closed]')
  .option('-s, --space <state>', 'Whether the space is open or closed (default = closed)', /^(closed|open)$/i, 'closed')
  .parse(process.argv);

// Check if "space=open" was given as argument
spaceOpen = program.space.toLowerCase() === 'open';

// Read MQTT configuration file
var mqttConfig;
try {
  mqttConfig = require('./mqtt_config.json');
} catch (e) {
  console.log('Could not parse MQTT configuration file: ' + e.message);
  mqttConfig = {
    caFile: "ca.crt",
    port: "8883",
    host: "mqtt.lambdaspace.gr"
  };
}

// Create an object with the API keys and access tokens
var APIKeys = require('./apikeys.json');
// If the keys file cannot be parsed, MinisterIN terminates abnormally

// Read tweet messages from the tweets.json file
var tweetMsgs;
var helloMsgs;
try {
  tweetMsgs = require('./tweets.json');
} catch (e) {
  console.log('Could not parse tweets file: ' + e.message);
  tweetMsgs = {
    'statusOpen': [
      "Minister is in"
    ],
    'statusClosed': [
      "Minister is out"
    ]
  };
}
try {
  helloMsgs = require('./hello.json');
} catch (e) {
  console.log('Could not parse hello file: ' + e.message);
  helloMsgs = {
    'hello': [
      "hello!"
    ]
  };
}

// Create a twitter client
var twitterClient = new Twitter({
  consumer_key: APIKeys.twitter.consumer_key,
  consumer_secret: APIKeys.twitter.consumer_secret,
  access_token_key: APIKeys.twitter.access_token_key,
  access_token_secret: APIKeys.twitter.access_token_secret
});

// Read Mattermost config
try {
  var mattermostConfig = require('./mattermost_config.json');
} catch (e) {
  console.log('Could not parse mattermost configuration file: ' + e.message);
}


// Create Mattermost client
if (mattermostConfig.hook_url) var mattermostClient = new mattermost(mattermostConfig.hook_url);
var mattermostBroadcast = function(msg, channel = '#town-square') {
  if (!msg) return;
  try {
    mattermostClient.send({
      text: msg,
      channel: channel,
      icon_url: mattermostConfig.icon,
      username: mattermostConfig.username
    });
    return true;
  } catch (e) {
    console.log('Could not post to mattermost' + e);
    return false;
  }
};

// Read IRC configuration file
var ircConfig;
try {
  ircConfig = require('./irc_config.json');
} catch (e) {
  console.log('Could not parse IRC configuration file: ' + e.message);
  ircConfig = {
    server: "irc.freenode.net",
    nick: "Consuela-λspace",
    channels: ["#LambdaSpace"]
  };
}

var CA = fs.readFileSync(__dirname + "/" + mqttConfig.caFile);

var mqttOptions = {
  port: mqttConfig.port,
  host: mqttConfig.host,
  protocol: 'mqtts',
  rejectUnauthorized: true,
  //The CA list will be used to determine if server is authorized
  ca: CA
};

try {
  var client = mqtt.connect(mqttOptions);
} catch (e) {
  console.log(e);
}

client.on('connect', function() {
  console.log('Connected to MQTT broker ' + mqttConfig.host);
});


// Create an IRC client
var ircClient = new irc.Client(ircConfig.server, ircConfig.nick, ircConfig);
ircClient.sayAllChannels = function(message) {
  ircConfig.channels.forEach(function(channel) {
    try {
      ircClient.say(channel, message);
    } catch (e) {
      console.log(e);
    }
  });
};

/**
 * Tweet the status of the space
 *
 * @param newStatus true if the space is open,
 * false if the space is closed.
 */
var broadcastStatusChange = function(newStatus) {
  var msg;
  var rand;
  if (newStatus) {
    rand = Math.floor(Math.random() * tweetMsgs.statusOpen.length);
    try {
      msg = tweetMsgs.statusOpen[rand] + ' - Space: OPEN';
    } catch (e) {
      console.log(e);
    }
  } else {
    rand = Math.floor(Math.random() * tweetMsgs.statusClosed.length);
    try {
      msg = tweetMsgs.statusClosed[rand] + ' - Space: CLOSED';
    } catch (e) {
      console.log(e);
    }
  }

  twitterClient.post('statuses/update', { status: msg }, function(error, tweet, response) {
    if (error) {
      console.log('Could not tweet: ' + tweet); // Tweet body.
      console.log(response); // Raw response object.
    } else {
      // IRC bot says the random message in the channel
      ircClient.sayAllChannels(msg);
      // Update the status of the spaceOpen variable only after the status
      // got successfully tweeted
      spaceOpen = newStatus;
    }
  });

  if (mattermostBroadcast(msg)) spaceOpen = newStatus;
};


/**
 * Updates the status of the space, given the number
 * of the hackers there.
 *
 * @param numOfHackers the number of hackers in space. or NaN
 * in case there was an error while parsing the hackers.txt file.
 */
var updateStatus = function(numOfHackers) {
  if (spaceOpen) {
    if (numOfHackers === 0) {
      // If space status was open and there are no hackers anymore
      broadcastStatusChange(false);
    }
  } else {
    if (numOfHackers > 0) {
      // If space was closed and there are hackers now
      broadcastStatusChange(true);
    }
  }
};

// Reply to questions directed to Consuela
ircClient.addListener('message#LambdaSpace', function(from, message) {
  var reply = bot(message, numOfHackers, helloMsgs);
  if (reply !== undefined) {
    try {
      ircClient.say(ircConfig.channels[0], from + reply);
    } catch (e) {
      console.log(e);
    }
  }
});

// Welcome new people joining the LambdaSpace channel
// ircClient.addListener('join#LambdaSpace', function(nick, message) {
//     ircClient.say(ircConfig.channels[0], nick + ", " +
//       helloMsgs.hello[Math.floor(Math.random() * helloMsgs.hello.length)]);
// });

// Github organization Webhooks
var gh_webhook_handler = gh_webhook({ 'path': '/lambdaspace', 'secret': APIKeys.github.webhook });
try {
  http.createServer(function(req, res) {
    gh_webhook_handler(req, res, function(err) {
      res.statusCode = 404;
      res.end('No such location');
    });
  }).listen(7777);
} catch (e) {
  console.log(e);

}

gh_webhook_handler.on('push', function(event) {
  ircClient.sayAllChannels(event.payload.pusher.name + ' pushed to repository ' + event.payload.repository.name + ':');
  event.payload.commits.forEach(function(commit) {
    var msg = '* ' + commit.author.name + ' - ' + commit.message;
    ircClient.sayAllChannels(msg);
    mattermostBroadcast(msg, '#off-topic');
  });
});

gh_webhook_handler.on('error', function(err) {
  console.error('Github Webhook error:', err.message);
});

// Add MQTT listener callback
client.on('message', function(topic, message) {
  numOfHackers = parseInt(message.toString());
  // If message could not be parsed to number
  if (isNaN(numOfHackers)) {
    console.log('Could not parse number of hackers: ' + message.toString());
    return;
  }
  updateStatus(numOfHackers);
  // Uncomment to debug number of hackers
  //console.log('Number of Hackers: ' + numOfHackers);
});

try {
  client.subscribe('lambdaspace/spacestatus/hackers');
} catch (e) {
  console.log(e);
}



/* Disclaimer: follows code that is very specific to the LambdaSpace stack */

// Parse events from discourse
var eventParser = function(topic) {
  var event = {};
  var tokens = topic.split(' ');
  event.day = tokens[0];
  if (!event.day.match(/^\d\d\/\d\d\/\d\d\d\d+$/)) {
    console.log('Not in expected format');
  }
  var dateTokens = tokens[0].split('/');
  event.date = new Date(dateTokens[2], dateTokens[1] - 1, dateTokens[0], 0, 0);

  if (tokens[1].match(/^\d\d:\d\d+$/)) {
    event.time = tokens[1];
    event.title = topic.substr(17);
  } else {
    event.time = "";
    event.title = topic.substr(11);
  }

  return event;
};

// Iterate the list of events from discourse and announce forthcoming ones
var parseEvents = function(data) {
  data.topic_list.topics.forEach(function(topic) {
    var event;
    try {
      event = eventParser(topic.title);
    } catch (e) {
      return;
    }
    var pubEvent = null;
    if (event.date.equals(Date.parse('today'))) {
      pubEvent = 'TODAY ';
    } else if (event.date.equals(Date.parse('tomorrow'))) {
      pubEvent = 'TOMORROW ';
    }
    if (!!pubEvent) {
      pubEvent = pubEvent + event.time + ' - ' + event.title;
      ircClient.sayAllChannels(pubEvent);
      pubEvent = pubEvent.substring(0, 139);
      twitterClient.post('statuses/update', { status: pubEvent }, function(error, tweet, response) {
        if (error) {
          console.log('Could not tweet event: ' + pubEvent); // Tweet body.
        }
      });
      mattermostBroadcast(pubEvent);
    }
  });
};

// Check for events every day at 11:00
cron.scheduleJob('0 0 11 * * * *', function() {
  try {
    request('https://community.lambdaspace.gr/c/5/l/latest.json', function(error, response, body) {
      if (!error && response.statusCode == 200) {
        try {
          parseEvents(JSON.parse(body));
        } catch (e) {
          console.log('Response from Discourse could not be parsed to JSON');
        }
      } else {
        console.log('Error while retrieving events.json');
      }
    });
  } catch (e) {
    console.log(e);
  }
});
