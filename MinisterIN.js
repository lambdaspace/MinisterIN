var http = require('http');

/**
 * Milliseconds before retrying to update the space status (=5 mins)
 * @type {number}
 */
const UPDATE_INTERVAL = 300000;

var numOfHackers;
var spaceOpen = false;

/**
 * Updates the status of the space, given the number
 * of the hackers there.
 *
 * @param numOfHackers the number of hackers in space. or -1
 * in case there was an error while parsing the hackers.txt file.
 */
updateStatus = function(numOfHackers) {
    // If hackers.txt could not be parsed
    if (numOfHackers == -1) {
        console.log('Could not parse hackers.txt file.');
        return;
    }

    if (spaceOpen) {
        // If space was open and there are no hackers anymore
        if (numOfHackers == 0) {
            spaceOpen = false;
            console.log("Space is empty.");
        }
    } else {
        // If space was closed and there are hackers now
        if (numOfHackers > 0) {
            spaceOpen = true;
            console.log("Space is open!")
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
    path: '/hackerss.txt'
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
        numOfHackers = parseInt(str) || -1;
        updateStatus(numOfHackers);
        console.log('Number of Hackers: ' + numOfHackers);
    });
};

// Set intervals for requesting the hackers.txt file
var updateInterval = setInterval(function() {
    http.request(getOptions, getCallback).end();
}, UPDATE_INTERVAL);