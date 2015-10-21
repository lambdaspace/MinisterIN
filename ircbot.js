module.exports = {
  // Reply with the status of TechMinistry when someone says "ConsuelaTM, status"
  containsNameAndStatus: function(message, numOfHackers, tweetMsgs) {
    var msg = message.toLowerCase();
    var containsName = false;
    var containStatus = false;
    var names = /(consuela|κονσου(έ|ε)λα)+/ig;
    var status = /(status|στ(α|ά)τ(ου|υ|θ)(σ|ς)|κατ(α|ά)σταση|χ(ώ|ω)ρο(ς|υ)|x(w|o)ro(s|u)|katastas(i|h)|an(i|oi|h)xtos|ανοιχτ(ο|ό)ς)+/ig;
    var hello = /(h(i|ello)|geia|γει(ά|α))+/ig;
    if (names.test(msg)) {
      if(status.test(msg)){
        if (numOfHackers == 0) {
          return ', sorry space is closed'
        } else if (numOfHackers == 1) {
          return ', there is one hacker at the moment'
        } else if (numOfHackers > 1) {
          return ', there are ' + numOfHackers + ' hackers at the moment'
        } else {
          return ', sorry I couldn\'t get the information you asked for, please try again in a few minutes'
        }
      }else if(hello.test(msg)) {
        return tweetMsgs.hello[Math.floor(Math.random() * tweetMsgs.hello.length)]
      }
    }
  }
};
