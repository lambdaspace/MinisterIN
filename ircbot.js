// Return the appropriate reply according to incoming message.
module.exports = function(message, numOfHackers, helloMsgs) {
  var msg = message.toLowerCase();
  var names = /(consuela|κονσου(έ|ε)λα)+/ig;
  var status = /(status|στ(α|ά)τ(ου|υ|θ)(σ|ς)|κατ(α|ά)σταση|χ(ώ|ω)ρο(ς|υ)|x(w|o)ro(s|u)|katastas(i|h)|open|closed|an(i|oi|h)xtos|ανοιχτ(ο|ό)ς)+/ig;
  var hello = /(\bh(i|ello|ey)\b|\bgeia\b|\bγει(ά|α)\b)+/ig;
  var help = /(help|βο(ή|η)θεια|vo(i|h)(th|8|u)(ei|i)a|dafuq)+/ig;
  if (names.test(msg)) {
    if (status.test(msg)) {
      if (numOfHackers == 0) {
        return ", sorry the space is closed";
      } else if (numOfHackers == 1) {
        return ", there is one hacker at the moment";
      } else if (numOfHackers > 1) {
        return ", there are " + numOfHackers + " hackers at the moment";
      } else {
        return ", sorry I couldn\'t get the information you asked " +
          "for, please try again in a few minutes";
      }
    } else if (hello.test(msg)) {
      return ", " + helloMsgs.hello[Math.floor(Math.random() * helloMsgs.hello.length)];
    } else if (help.test(msg)) {
      return ", hello I am beautiful bot written in node.js! " +
        "You can ask me if Tech Ministry is open or closed " +
        "or you can just say hi! Last but not least " +
        "you could check my source code here:" +
        "https://github.com/techministry/MinisterIN";
    } else {
      return ", sorry I don't know how to respond to that " +
        "but you can always ask me for help if you need some.";
    }
  }
};
