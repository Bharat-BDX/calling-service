// Required to verify vendor signature BEFORE JSON parsing
module.exports = function rawBodyMiddleware(req, res, next) {
  let data = '';

  req.on('data', chunk => {
    data += chunk;
  });

  req.on('end', () => {
    req.rawBody = data;
    next();
  });
};