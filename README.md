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
  prefix: "", // key prefix for sqs queues
  cache: awscp.cache(...) //optional, for unique push calls
})

// Push job
broker.push({
  queue: "fetch-something", // sqs queue name
  delay: 0, // optional delay in ms module syntax ("10s", "5m" etc)
  data: {}, // payload
  unique: "somekey" // if you provide a cache instance during setup, the broker will filter out duplicate pushes according to this key, for the period specified in delay key.
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
  concurrency: 1, // process n messages within the same batch
  runDelay: null // wait time between fetch runs
}, function(msg, next) {
  // handle msg
  next(); // no need to remove msg explicitly, if you return an error to next, message gets re scheduled, otherwise it's deleted
});
```

### lock
Distributed locks over DynamoDB

```js
var lock = awscp.lock({
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

### cache
Elasticache wrapper

```js
var cache = awscp.cache({
  prefix: "" // key prefix,
  discovery: { // passed directly to ecad (https://www.npmjs.org/ecad)
    endpoints: ['my-elasticache-cluster-hostname1:11211', 'my-elasticache-cluster-hostname2:11211']
  },
  hostnames: [...memcached node hostnames...], // either provide discovery or hostnames field
  memcached: {
    // passed directly to node-memcached client (https://www.npmjs.org/memcached)
  }
})

// Proxies memcached commands to underlying memcached client
// Only difference is that you should use ms module syntax ("10s", "5m" etc) or milliseconds for cache durations. Precision is 1 second though.
cache.set, cache.get, cache.del ...

// Helper
cache.auto(key, function miss(next) {
  // item not cached
  next(null, "some data");
}, function hit(err, data) {
  // data gets passed here either from cache or the miss function
}, ttl); //ttl is in ms module syntax ("10s", "5m" etc)
```

### ratelimit
Rate limiting over cache

```js
var cache = awscp.cache(...);
var limiter = awscp.ratelimit({
  cache: cache
});

// Increase rate limiter state for current window
limiter.hit({
  key: "some-operation",
  window: "10s", // limit window
  limit: 5 // limit per window
}, function(err, hit) {
  if (!hit) {
    // this operation has been performed more than 5 times in 10 seconds
  } else {
    ...
  }
})

// Check current status
limiter.peek({
  key: "some-operation",
  window: "10s", // limit window
  limit: 5 // limit per window
}, function(err, count) {
  // count for current window
})
```

### lambda
Lambda wrapper

```js
var lambda = awscp.lambda();

//invoke functions
lambda.invoke({
  functionName:'some-function', // function name of lambda function
  data: {} // payload
}, function(err){
  
})
```

##author

Ekin Koc

## License

MIT
