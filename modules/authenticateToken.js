// middleware function : verification of the input jwt access token sent into the request
const jwt = require('jsonwebtoken');
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']; 
    const token = authHeader && authHeader.split(' ')[1]; // expected format "Bearer <token>"
    if (!token) return res.sendStatus(401);
  
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user; // attach the user info to the request
      next(); // next route
    });
  };
  module.exports={authenticateToken};