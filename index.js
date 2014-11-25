var util = require("util");
var events = require("events");

function AWSCP() {
  events.EventEmitter.call(this);
  this.config = {};
}

util.inherits(AWSCP, events.EventEmitter);

AWSCP.prototype.log = function(level) {
  this.emit("log", {
    level: level,
    data: [].slice.call(arguments, 1)
  });
};

["queue", "lock"].forEach(function (mod) {
  AWSCP.prototype[mod] = function(options) {
    return require("./lib/" + mod)(this, options);
  };
});

module.exports = new AWSCP();
