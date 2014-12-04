var aws = require("aws-sdk");
var ecad = require("ecad");
var memcached = require("memcached");

var methods = ["touch", "get", "gets", "getMulti", "set", "replace", "add", "cas", "append", "prepend", "incr", "decr", "del"];
var ttlindex = { "touch": 1, "set": 2, "replace": 2, "add": 2, "cas": 2 };

function Cache(cp, options) {
  if (!(this instanceof Cache))
    return new Cache(cp, options);

  this.options = options;
  this.prefix = options.prefix || "";
  this.cp = cp;

  if (options.discovery)
    this.ecad = new ecad(options.discovery);
  else if (options.hostnames)
    this.hostnames = options.hostnames;
  else
    throw new Error("Cache constructor expects either discovery or hostnames field.");
}

Cache.prototype.getClient = function(next) {
  var self = this;

  if (this.client)
    return next(null, this.client);

  if (this.hostnames) {
    self.client = new memcached(this.hostnames, self.options.memcached || {});
    return next(null, self.client);
  }

  this.ecad.fetch(function (err, hosts) {
    if (err) return next(err);
    self.client = new memcached(hosts, self.options.memcached || {});
    next(null, self.client);
  });
};

methods.forEach(function (method) {
  Cache.prototype[method] = function() {
    var args = [].slice.call(arguments);

    if (ttlindex.hasOwnProperty(method)) {
      var index = ttlindex[method];
      args[index] = this.cp.sec(args[index]);
    }

    if (method == 'getMulti')
      args[0] = args[0].map(function(key) { return this.prefix + key; }.bind(this));
    else
      args[0] = this.prefix + args[0];

    if (this.client)
      return this.client[method].apply(this.client, args);

    this.getClient(function (err, client) {
      if (err) return next(err);
      client[method].apply(client, args);
    });
  }
});

Cache.prototype.auto = function(key, miss, next, ttl, grace) {
  var self = this;

  self.getObject(key, function (err, data) {
    if (err) return next(err);
    if (typeof data !== 'undefined') return next(null, data);

    miss(function(err, data, overridettl) {
      if (err) return next(err);

      self.setObject(key, data, overridettl || ttl, function (err) {
        if (err) return next(err);
        next(null, data);
      })
    })
  })
};

Cache.prototype.setObject = function(key, value, ttl, next) {
  this.set(key, JSON.stringify(value || null), ttl, next);
};

Cache.prototype.getObject = function(key, next) {
  this.get(key, function (err, data) {
    if (err || typeof data != 'string') return next(err, data);

    try {
      next(null, JSON.parse(data));
    } catch(e) {
      next(e);
    }
  });
};

module.exports = Cache;
