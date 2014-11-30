var aws = require("aws-sdk");
var crypto = require("crypto");

var noop = function() {};

function Locker(cp, options) {
  if (!(this instanceof Locker))
    return new Locker(cp, options);

  this.table = options.table;

  if (!this.table)
    throw new Error("Lock module requires sqs table name.")

  this.prefix = options.prefix || "";
  this.cp = cp;
  this.db = new aws.DynamoDB(cp.config);
}

function Lock(locker, name, value, ttl) {
  this.locker = locker;
  this.name = name;
  this.value = value;
  this.ttl = ttl;
}

Lock.prototype.renew = function(ttl, next) {
  if (typeof ttl == 'function') {
    next = ttl;
    ttl = this.ttl;
  }

  next = next || noop;

  var self = this;
  this.locker.renew(this.name, this.value, ttl, function (err, nlock) {
    if (err) return next(err);

    self.value = nlock.value;
    self.ttl = nlock.ttl;

    next(null, self);
  });
};

Lock.prototype.release = function(next) {
  this.locker.release(this.name, this.value, next);
};

Locker.prototype.acquire = function(name, ttl, next) {
  var value = crypto.randomBytes(32).toString('hex')
    , key = this.prefix + "-" + name
    , self = this

  this.db.putItem({
    ConditionExpression: "(attribute_not_exists(LockKey)) or (Expires < :curdate)",
    Item: {
      "LockKey": { "S": key },
      "LockValue": { "S": value },
      "Expires": { "N": String(Date.now() + this.cp.ms(ttl)) }
    },
    ExpressionAttributeValues: {
      ":curdate": { "N": String(Date.now()) }
    },
    TableName: this.table
  }, function (err, data) {
    if (err && err.code == "ConditionalCheckFailedException") return next();
    if (err) return next(err);
    next(null, new Lock(self, name, value, ttl));
  });
};

Locker.prototype.renew = function(name, value, ttl, next) {
  var key = this.prefix + "-" + name
    , self = this

  next = next || noop;

  this.db.putItem({
    ConditionExpression: "(attribute_not_exists(LockKey)) or (LockValue = :lockValue)",
    Item: {
      "LockKey": { "S": key },
      "LockValue": { "S": value },
      "Expires": { "N": String(Date.now() + this.cp.ms(ttl)) }
    },
    ExpressionAttributeValues: {
      ":lockValue": { "S": value }
    },
    TableName: this.table
  }, function (err, data) {
    if (err && err.code == "ConditionalCheckFailedException") return next();
    if (err) return next(err);
    next(null, new Lock(self, name, value, ttl));
  });
};

Locker.prototype.release = function(name, value, next) {
  var key = this.prefix + "-" + name;

  next = next || noop;

  this.db.deleteItem({
    ConditionExpression: "LockValue = :value",
    Key: {
      "LockKey": { "S": key }
    },
    ExpressionAttributeValues: {
      ":value": { "S": value }
    },
    TableName: this.table
  }, function (err, data) {
    if (err && err.code == "ConditionalCheckFailedException") return next();
    if (err) return next(err);
    next();
  });
};

module.exports = Locker;
