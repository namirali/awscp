function RateLimit(cp, options) {
  if (!(this instanceof RateLimit))
    return new RateLimit(cp, options);

  this.cache = options.cache;

  if (!this.cache)
    throw new Error("Lock module requires an instance of cache module.")

  this.cp = cp;
}

RateLimit.prototype.hit = function(options, next) {
  var self = this;

  if (!options.key)
    return next(new Error("Ratelimiter requires a limit key"));

  options.window = this.cp.ms(options.window || '10s');
  options.limit = options.limit || 10;

  key = [
    "ratelimit",
    Math.floor((new Date()).getTime() / options.window).toString(),
    options.key
  ].join(":");

  self.cache.add(key, 0, options.window, function () {
    self.cache.incr(key, 1, function (err, cnt) {
      if (err) return next(err);

      if (parseInt(cnt, 10) > options.limit)
        return next(null, false);

      next(null, {
        current: cnt,
        limit: options.limit,
        window: options.window
      });
    })
  })
};

module.exports = RateLimit;
