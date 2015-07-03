module.exports = {
  // Reply with the status of TechMinistry when someone says "ConsuelaTM, status"
  containsNameAndStatus: function(message, numOfHackers) {
    var msg = message.toLowerCase().split(" ");
    var containsName = false;
    var containStatus = false;
    var names = ["consuelatm", "consuelatm,", "consuelatm:", "consuela", "consuela,", "consuela:", "κονσουέλα", "κονσουελα", "κονσουέλα,", "κονσουελα,", "κονσουέλα:", "κονσουελα:", "ψονσθελα"];
    var status = ["status", "στάτους", "στατους", "στατθσ", "στατυς", "katastasi", "katastash", "στάτυς", "κατάσταση", "κατασταση",
      "anoixtos", "anixtos", "ανοιχτός", "ανοιχτος", "xwros", "xoros", "χωρος", "χώρος"
    ];
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
    if (numOfHackers == 0) {
      return ', sorry space is closed'
    } else if (numOfHackers == 1) {
      return ', there is one hacker at the moment'
    } else if (numOfHackers > 1) {
      return ', there are ' + numOfHackers + ' hackers at the moment'
    } else {
      return ', sorry I couldn\'t get the information you asked for, please try again in a few minutes'
    }
  }
};
