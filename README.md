#awscp - AWS Care Package
Several AWS service wrappers for distributed Node.JS clusters.

## installation
```
npm install awscp
```

```
var awscp = require("awscp");

awscp.config = {
  // AWS Config object for access keys, region settings etc. Refer to aws-sdk module documentation.
}
```

## modules
### queue
SQS Wrapper for job queues.

```js
var broker = awscp.queue({
  prefix: "" // key prefix for sqs queues
})

// Push job
broker.push({
  queue: "fetch-something", // sqs queue name
  delay: 0, // optional delay in ms module syntax ("10s", "5m" etc)
  data: {} // payload
}, callback)

// Pop a single Job
broker.pop({
  queue: "fetch-something",
  ttl: 60, // visibility timeout in ms module syntax ("10s", "5m" etc), if the job is not removed during this time, it gets requeued
  wait: 0 // lonk polling timeout in ms module syntax ("10s", "5m" etc). client will wait this long until a job is available
}, callback(function(err, msg) {
  console.log(msg.data) // get the payload specified in push
  msg.remove(callback) // remove job from queue
}));

// Receive multiple Jobs
broker.receive({
  // same options as .pop
  count: 1 // limit response to count messages (max 10)
}, function(err, messages) {
  // messages is array of msg objects
})

// Register a Job handler
broker.handler({
  queue: 'fetch-something',
  ttl: 60,
  wait: 0,
  concurrency: 1 // process n messages within the same batch
}, function(msg, next) {
  // handle msg
  next(); // no need to remove msg explicitly, if you return an error to next, message gets re scheduled, otherwise it's deleted
});
```

### lock
Distributed locks over DynamoDB

```js
var lock = awscp.queue({
  prefix: "" // key prefix for locks,
  table: "lock_table" // DynamoDB table for locks. Should have a hash index on "LockKey" column.
})

lock.acquire(
  name, // name of the lock
  ttl: // release duration in ms module syntax ("10s", "5m" etc)
  function(err, lock) {
    lock.release(callback) // releases the lock
    lock.renew(ttl, callback) // renews the lock
  }
);
```

##author

Ekin Koc

## License

MIT
