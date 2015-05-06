// Include needed node.js modules
var http = require('http');
var Twitter = require('twitter');

/**
 * Milliseconds before retrying to update the space status (=5 mins)
 * @type {number}
 */
const UPDATE_INTERVAL = 300000;

var numOfHackers;
var spaceOpen = false;


// Create an object with the twitter keys and access tokens
var twitterKeys = require('./twitter.key');

// Create a twitter client
var twitterClient = new Twitter({
    consumer_key: twitterKeys.consumer_key,
    consumer_secret: twitterKeys.consumer_secret,
    access_token_key: twitterKeys.access_token_key,
    access_token_secret: twitterKeys.access_token_secret
});

/**
 * Tweet the status of the space
 *
 * @param newStatus true if the space is open,
 * false if the space is closed.
 */
var tweetSpaceOpened = function(newStatus) {
    var tweetMsg = (newStatus)
        ? "Minister is in, the door is open."
        : "Minister is out, the space is closed." ;

    twitterClient.post('statuses/update', {status: tweetMsg},  function(error, tweet, response){
        if(error) {
            console.log("Could not tweet: " + tweet);  // Tweet body.
            console.log(response);  // Raw response object.
        } else {
            console.log("Successfully tweeted: " + tweet);
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
updateStatus = function(numOfHackers) {
    // If hackers.txt could not be parsed
    if (isNaN(numOfHackers)) {
        console.log('Could not parse hackers.txt file.');
        return;
    }

    if (spaceOpen) {
        if (numOfHackers == 0) {
            // If space status was open and there are no hackers anymore
            console.log("Space is empty.");
            tweetSpaceOpened(false);
        }
    } else {
        if (numOfHackers > 0) {
            // If space was closed and there are hackers now
            console.log("Space is open!")
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
getCallback = function(response) {
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
    http.request(getOptions, getCallback).end();
}, UPDATE_INTERVAL);
