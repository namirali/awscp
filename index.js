var util = require("util");
var events = require("events");
var ms = require("ms");

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

AWSCP.prototype.ms = function(val) {
  return ms(String(val));
};

AWSCP.prototype.sec = function(val) {
  return Math.round(ms(String(val)) / 1000);
};

["queue", "lock", "cache", "ratelimit", "lambda"].forEach(function (mod) {
  AWSCP.prototype[mod] = function(options) {
    return require("./lib/" + mod)(this, options);
  };
});

module.exports = new AWSCP();
