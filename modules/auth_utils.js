// Utilities related to authentication tokens
const uid2 = require("uid2");
const jwt = require("jsonwebtoken");

const TOKEN_SECRETS = {
  access: process.env.ACCESS_TOKEN_SECRET,
  refresh: process.env.REFRESH_TOKEN_SECRET,
};

// check the validity of the input jwt token
function verifyToken(token, type = "access") {
  const secret = TOKEN_SECRETS[type];
  if (!secret) throw new Error(`Unknown token type: ${type}`);

  try {
    return jwt.verify(token, secret);
  } catch (err) {
    return null;
  }
}

// create a jwt token
function createToken(userId, duration, type = "access", duration_unit = "m") {
  try {
    const secret = TOKEN_SECRETS[type];
    const token = jwt.sign({ userId }, secret, {
      expiresIn: `${duration}` + duration_unit,
    });

    return token;
  } catch (err) {
    return null;
  }
}

// middleware function : verification of the input jwt access token sent into the request
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // expected format "Bearer <token>"
  if (!token)
    return res.status(401).json({ result: false, message: "Token missing" });

  const payload = verifyToken(token, "access");
  if (!payload)
    return res
      .status(401)
      .json({ result: false, message: "Token expired or invalid" });

  req.user = payload.userId; // attach the user id to the request
  next(); // next route
}

// utility : creates a unique token and a expiration date (nbHours hours from now)
// returns : { token, token_expiration}
function createVerificationToken(nbHours) {
  // create a token to identify the new user uniquely
  const token = uid2(32);
  // create the expiration datetime of the token
  const token_expiration = new Date();
  token_expiration.setHours(token_expiration.getHours() + nbHours);
  return { token, token_expiration };
}

module.exports = {
  verifyToken,
  createToken,
  authenticateToken,
  createVerificationToken,
};
