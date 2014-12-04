function RateLimit(cp, options) {
  if (!(this instanceof RateLimit))
    return new RateLimit(cp, options);

  this.cache = options.cache;

  if (!this.cache)
    throw new Error("Lock module requires an instance of cache module.")

  this.cp = cp;
}

RateLimit.prototype._getKey = function(options) {
  var win = this.cp.ms(options.window || '10s');

  return [
    "ratelimit",
    Math.floor((new Date()).getTime() / win).toString(),
    options.key
  ].join(":");
}

RateLimit.prototype.hit = function(options, next) {
  var self = this;

  if (!options.key)
    return next(new Error("Ratelimiter requires a limit key"));

  options.window = options.window || '10s';
  options.limit = options.limit || 10;

  var key = this._getKey(options);

  self.cache.add(key, 0, options.window, function () {
    self.cache.incr(key, 1, function (err, cnt) {
      if (err) return next(err);

      if (parseInt(cnt, 10) > options.limit)
        return next(null, false);

      next(null, cnt);
    })
  })
};

RateLimit.prototype.peek = function(options, next) {
  var self = this;

  if (!options.key)
    return next(new Error("Ratelimiter requires a limit key"));

  self.cache.get(this._getKey(options), function (err, cnt) {
    if (err) return next(err);
    if (!cnt) return next(null, 0);
    next(null, parseInt(cnt, 10));
  })
};

module.exports = RateLimit;
