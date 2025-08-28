// api/index.js
const serverless = require('serverless-http');
const app = require('../app'); // ← ton app.js

module.exports = (req, res) => {
  const handler = serverless(app);
  return handler(req, res);
};