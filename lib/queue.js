var aws = require("aws-sdk");
var async = require("async");

function Broker(cp, options) {
  if (!(this instanceof Broker))
    return new Broker(cp, options);

  this.cp = cp;
  this.sqs = new aws.SQS(cp.config);
  this.prefix = options.prefix || "";
  this.queueCache = {};
}

Broker.prototype._getQueue = function(name, next) {
  var self = this;
  name = this.prefix + name;

  if (this.queueCache[name])
    return next(null, this.queueCache[name]);

  this.sqs.createQueue({
    QueueName: name
  }, function (err, data) {
    if (err || !data.QueueUrl) return next(err || new Error("Unable to ubtain queue url."));
    self.queueCache[name] = data.QueueUrl;
    next(null, data.QueueUrl);
  })
};

function Message(options) {
  this.broker = options.broker;
  this.queue = options.queue;
  this.handle = options.message.ReceiptHandle;
  this.id = options.message.MessageId;
  this.data = JSON.parse(options.message.Body);
}

Message.prototype.remove = function(next) {
  this.broker.remove({
    queue: this.queue,
    handle: this.handle
  }, next);
};

Broker.prototype.push = function(options, next) {
  var self = this;

  if (typeof options.data == 'undefined')
    options.data = null;

  options.delay = options.delay || 0;

  self._getQueue(options.queue, function (err, qurl) {
    if (err) return next(err);

    self.sqs.sendMessage({
      QueueUrl: qurl,
      MessageBody: JSON.stringify(options.data || null),
      DelaySeconds: options.delay,
    }, function (err, data) {
      if (err) return next(err);
      next(null, data.MessageId);
    });
  });
};

Broker.prototype.pop = function(options, next) {
  options.count = 1;

  this.receive(options, function (err, data) {
    if (err) return next(err);
    if (!data.length) return next();
    next(null, data[0]);
  });
};

Broker.prototype.receive = function(options, next) {
  var self = this;

  self._getQueue(options.queue, function (err, qurl) {
    if (err) return next(err);

    self.sqs.receiveMessage({
      QueueUrl: qurl,
      VisibilityTimeout: options.ttl || 60,
      WaitTimeSeconds: (typeof options.wait == 'undefined') ? 0 : options.wait,
      MaxNumberOfMessages: options.count || 1
    }, function (err, data) {
      if (err) return next(err);

      var messages = data.Messages || [];

      try {
        messages = messages.map(function (msg) {
          return new Message({
            broker: self,
            queue: options.queue,
            message: msg
          });
        });

        next(null, messages);
      } catch(e) {
        next(e);
      }
    });
  });
};

Broker.prototype.remove = function(options, next) {
  var self = this;

  self._getQueue(options.queue, function (err, qurl) {
    if (err) return next(err);

    self.sqs.deleteMessage({
      QueueUrl: qurl,
      ReceiptHandle: options.handle
    }, next);
  });
};

Broker.prototype.handler = function(options, fn) {
  var self = this;

  options.concurrency = options.concurrency || 1;

  function next(err) {
    if (err)
      self.cp.log('error', 'queue:handler', err);

    self.receive({
      queue: options.queue,
      ttl: options.ttl,
      wait: options.wait || 5,
      count: options.concurrency
    }, function (err, msgs) {
      if (err) return setImmediate(next, err);
      if (!msgs.length) return setImmediate(next);

      async.each(msgs, function (msg, next) {
        fn(msg, function (err, data) {
          if (err) {
            self.cp.log('error', 'queue:handler', err);
            return next();
          }

          msg.remove(next);
        })
      }, next);
    });
  }

  next();
}

module.exports = Broker;