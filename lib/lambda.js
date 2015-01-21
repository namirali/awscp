var aws = require("aws-sdk");

function Lambda (cp) {
  if (!(this instanceof Lambda))
    return new Lambda(cp);

  this.cp = cp;
  this.lambda = new aws.Lambda(cp.config);
}

Lambda.prototype.invoke = function (options, next) {
  if (!options.functionName)
    return next(new Error("Function name needed"));

  if (!options.data)
    options.data = {};

  if (!(options.data instanceof Object))
    return next(new Error("Data passed to function must be an object"));

  this.lambda.invokeAsync({
    FunctionName: options.functionName,
    InvokeArgs: JSON.stringify(options.data)
  }, function (err, data) {
    if (err || data.Status && data.Status != 202) return next(err || new Error('Failed to invoke function %s', options.functionName));
    return next(null);
  })
};

module.exports = Lambda;
