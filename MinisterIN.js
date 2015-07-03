// Include needed node.js modules
var fs = require('fs');
var http = require('http');
var Twitter = require('twitter');
var irc = require('irc');
var gh_webhook = require('github-webhook-handler');

/**
 * Milliseconds before retrying to update the space status (=10 mins)
 * @type {number}
 */
const UPDATE_INTERVAL = 600000;

var numOfHackers = -1;
var spaceOpen = false;

// Check if "space=open" was given as argument
process.argv.slice(2).forEach(function (val, index, array) {
  switch (val) {
    case 'space=open':
      spaceOpen = true;
    case 'space=closed':
      break;
    case '-h':
    case '--help':
    default:
      console.log('Usage: node MinisterIN.js [options]\n');
      console.log('Options:');
      console.log('  space=[open, closed]\tset the current space status (default = closed)');
      console.log('  -h, --help\t\tprint this message');
      process.exit(code=0);
  }
});

// Read tweet messages from the tweets.json file
var tweetMsgs;
try {
    tweetMsgs = JSON.parse(fs.readFileSync("tweets.json"));
} catch (e) {
    console.log('Could not parse tweets file: ' + e.message);
    tweetMsgs = {
        'statusOpen': [
            "Minister is in"
        ],
        'statusClosed': [
            "Minister is out"
        ]
    }
}


// Create an object with the twitter keys and access tokens
var twitterKeys = require('./twitter.key');

// Create a twitter client
var twitterClient = new Twitter({
    consumer_key: twitterKeys.consumer_key,
    consumer_secret: twitterKeys.consumer_secret,
    access_token_key: twitterKeys.access_token_key,
    access_token_secret: twitterKeys.access_token_secret
});

// Read IRC configuration file
var ircConfig;
try {
    ircConfig = JSON.parse(fs.readFileSync("irc_config.json"));
} catch (e) {
    console.log('Could not parse IRC configuration file: ' + e.message);
    ircConfig = {
        server: "irc.freenode.net",
        nick: "ConsuelaTM",
        channels: ["#TechMinistry"]
    }
}

// Create an IRC client
var ircClient = new irc.Client(ircConfig.server, ircConfig.nick, ircConfig);

/**
 * Tweet the status of the space
 *
 * @param newStatus true if the space is open,
 * false if the space is closed.
 */
var tweetSpaceOpened = function(newStatus) {
    var tweetMsg;
    var rand;
    if (newStatus) {
        rand = Math.floor(Math.random() * tweetMsgs.statusOpen.length);
        tweetMsg = tweetMsgs.statusOpen[rand] + ' - Space: OPEN';
    } else {
        rand = Math.floor(Math.random() * tweetMsgs.statusClosed.length);
        tweetMsg = tweetMsgs.statusClosed[rand] + ' - Space: CLOSED';
    }

    twitterClient.post('statuses/update', {status: tweetMsg},  function(error, tweet, response){
        if(error) {
            console.log('Could not tweet: ' + tweet);  // Tweet body.
            console.log(response);  // Raw response object.
        } else {
            // IRC bot says the random message in the channel
            ircClient.say(ircConfig.channels[0], tweetMsg);
            console.log('Successfully tweeted: ' + tweet);

            // Update the status of the spaceOpen variable only after the status
            // got successfully tweeted
            spaceOpen = newStatus;
        }
    });
};


/**
 * Updates the status of the space, given the number
 * of the hackers there.
 *
 * @param numOfHackers the number of hackers in space. or NaN
 * in case there was an error while parsing the hackers.txt file.
 */
var updateStatus = function(numOfHackers) {
    // If hackers.txt could not be parsed
    if (isNaN(numOfHackers)) {
        console.log('Could not parse hackers.txt file.');
        return;
    }

    if (spaceOpen) {
        if (numOfHackers == 0) {
            // If space status was open and there are no hackers anymore
            console.log('Space is empty.');
            tweetSpaceOpened(false);
        }
    } else {
        if (numOfHackers > 0) {
            // If space was closed and there are hackers now
            console.log('Space is open!');
            tweetSpaceOpened(true);
        }
    }
};


/**
 * Options for the GET request
 *
 * @type {{host: string, path: string}}
 */
var getOptions = {
    host: 'www.techministry.gr',
    path: '/hackers.txt'
};

/**
 * Callback function for the GET hackers.txt request
 *
 * @param response the response of the GET request
 */
var getCallback = function(response) {
    var str = '';
    response.on('data', function (chunk) {
        str += chunk;
    });

    response.on('end', function () {
        numOfHackers = parseInt(str);
        updateStatus(numOfHackers);
        // Uncommnent to debug number of hackers
        //console.log('Number of Hackers: ' + numOfHackers);
    });
};


// Set intervals for requesting the hackers.txt file
var updateInterval = setInterval(function() {
    var req = http.request(getOptions, getCallback);

    req.on('error', function(e) {
        console.log('Error while GETting hackers.txt: ' + e.message);
    });

    req.end();
}, UPDATE_INTERVAL);

// Reply with the status of TechMinistry when someone says "ConsuelaTM, status"
ircClient.addListener('message#TechMinistry', function(from, message){
  var msg = message.toLowerCase().split(" ");
  var containsName = false;
  var containStatus = false;
  var names = ["consuelatm", "consuelatm,", "consuelatm:", "consuela", "consuela,", "consuela:", "κονσουέλα", "κονσουελα", "κονσουέλα,", "κονσουελα,", "κονσουέλα:", "κονσουελα:", "ψονσθελα"];
  var status = ["status", "στάτους", "στατους", "στατθσ", "στατυς", "katastasi", "katastash", "στάτυς", "κατάσταση", "κατασταση",
"anoixtos", "anixtos", "ανοιχτός", "ανοιχτος", "xwros", "xoros", "χωρος", "χώρος"];
  for (var i = 0; i < msg.length; i++) {
    if (names.indexOf(msg[i]) > -1) {
      containsName = true;
    } else if (status.indexOf(msg[i]) > -1) {
      containStatus = true;
    }
    if (containsName && containStatus) {
      break;
    }
  }
  if (containsName && containStatus) {
    if (numOfHackers == 0) {
      ircClient.say(ircConfig.channels[0], from + ', sorry space is closed');
    } else if (numOfHackers == 1) {
      ircClient.say(ircConfig.channels[0], from + ', there is one hacker at the moment');
    } else if (numOfHackers > 1) {
      ircClient.say(ircConfig.channels[0], from + ', there are ' + numOfHackers + ' hackers at the moment');
    } else {
      ircClient.say(ircConfig.channels[0], from + ', sorry I couldn\'t get the information you asked for, please try again in a few minutes');
    }
  }
})

// Github organization Webhooks
var gh_webhook_handler = gh_webhook({'path': '/techministry'}, 'secret': 'secret');
http.createServer(function (req, res) {
  gh_webhook_handler(req, res, function (err) {
    res.statusCode = 404;
    res.end('No such location');
  })
}).listen(7777);

gh_webhook_handler.on('*', function (event) {
  if (event.payload.repository.name !== 'undefined') {
    ircClient.say(ircConfig.channels[0], 'Update on respository '  + event.payload.repository.name);
  }
});

gh_webhook_handler.on('error', function (err) {
  console.error('Github Webhook error:', err.message);
});
