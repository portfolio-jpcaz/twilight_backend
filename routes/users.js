var express = require("express");
var router = express.Router();
const { checkBody, sendEmailWithGmail } = require("../modules/utils");

const bcrypt = require("bcrypt");
const {
  createToken,
  verifyToken,
  createVerificationToken,
} = require("../modules/auth_utils");

const {
  VERIFICATION_SUBJECT,
  WELCOME_MESSAGE,
  LINK_VALIDITY_DURATION,
  REFRESH_TOKEN_DURATION,
  ACCES_TOKEN_DURATION,
  RESET_PASSWORD_TOKEN_DURATION,
  RESET_PASSWORD_MESSAGE,
  RESET_PASSWORD_SUBJECT,
} = require("../modules/constants");
const {
  sqlFindUserByEmail,
  sqlFindUserByName,
  sqlUpdateVerifiedUser,
  sqlCreateUser,
  sqlFindUserByToken,
  sqlDeleteUser,
  sqlUpdateUserToken,
  sqlUpdateUserPassWord,
  sqlCheckUser,
} = require("../db/queries");


/* Create a new user into the database (Users Table) : Sign up */
// user record includes a hashed password and a token for further verification
// send a email with a verification link to teh user
// return { result: boolean, message: string}
router.post("/signup", async (req, res) => {
  const { isValid, missing } = checkBody(req.body, [
    "username",
    "firstname",
    "email",
    "password",
  ]);
  if (!isValid) {
    return res.status(400).json({ error: `bad request : missing ${missing}` });
  }
  console.log("valid request");
  // Check if the user has not already been registered
  const { username, email, firstname, password } = req.body;
  try {
    const existingUser = await sqlFindUserByName(username);
    if (existingUser) {
      return res
        .status(409)
        .json({ result: false, message: "User already exists" });
    }
    const existingEmail = await sqlFindUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({
        result: false,
        message: "This email is used by another account",
      });
    }

    // create a new user
    // hash the password
    const hash = await bcrypt.hash(password, 10);
    // create a token to identify the new user uniquely
    const { token, token_expiration } = createVerificationToken(
      LINK_VALIDITY_DURATION
    );
    const newUser = {
      username,
      email,
      first_name: firstname,
      password: hash,
      token,
      token_expiration,
    };
    // create a new user in the Twilight DB (by default : not verified)
    const signupResponse = await sqlCreateUser(newUser);
    if (signupResponse.success) {
      // create a verification link
      const verificationLink = `${process.env.PUBLIC_BACKEND_URL}/users/verify-email/${token}`;
      // send welcome email message
      console.log("About to send email...");
      const emailRes = await sendEmailWithGmail(
        VERIFICATION_SUBJECT,
        WELCOME_MESSAGE(firstname, verificationLink),
        email
      );
      console.log("Email result:", emailRes);
    }
    return res.status(201).json({
      result: true,
      message:
        "Signup successful. Please check your email to verify your account.",
    });
  } catch (err) {
    return res
      .status(500)
      .json({ result: false, message: `Users database error :${err.message}` });
  }
});

// login route: from the passed credentials check if the user exists
// if so : returns a refresh token(as a cookie), a session token, and the info
// about the user (name, firstname, email) : { result:true, accessToken, user }
// otherwise returns an error message { result:false, message }
router.post("/signin", async (req, res) => {
  console.log('🔥 SIGNIN: Route appelée');
  console.log('🔥 SIGNIN: Body reçu:', req.body);
  const { isValid, missing } = checkBody(req.body, ["username", "password"]);
  if (!isValid) {
    return res
      .status(400)
      .json({ result: false, message: `bad request : missing ${missing}` });
  }
  // check if the user exists
  const { username, password } = req.body;
  console.log('🔥 SIGNIN: Avant requête DB');
  const user = await sqlFindUserByName(username);
  if (!user) {
    return res.status(401).json({ result: false, message: "Wrong username" });
  }
  // check the password
  const rightPasswd = await bcrypt.compare(password, user.password);
  if (!rightPasswd) {
    return res.status(401).json({ result: false, message: "Wrong password" });
  }
  // ✅ login successful create a session token
  const accessToken = createToken(user.id, ACCES_TOKEN_DURATION);

  // create a refresh token as well
  const refreshToken = createToken(
    user.id,
    REFRESH_TOKEN_DURATION,
    "refresh",
    "d"
  );

  // send the refresh token as  HttpOnly cookie
  const isProd = process.env.NODE_ENV === "production";
  const cookieOptions = {
    httpOnly: true,
    maxAge: REFRESH_TOKEN_DURATION * 24 * 60 * 60 * 1000,
    sameSite : isProd ? "none" : "lax",
    secure: isProd
  };

  
  res.cookie("refreshToken", refreshToken, cookieOptions);
  console.log("Cookie set, sending response...");
  // Réponse frontend avec accessToken
  return res.status(200).json({
    result: true,
    accessToken,
    user: { id: user.id, username, firstname: user.first_name, email: user.email },
  });
});

// route to validate the signup through the verification link sent by email
// retrieves the user from the input token
// if found and if the token has not expired, set the user as "verified"
// and delete the token. redirects the user to a success page
router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;
    // find the user from the token
    const user = await sqlFindUserByToken(token);
    if (!user) {
      return res.status(400).json({
        result: false,
        message: "Invalid Verification Link",
      });
    }
    // check the token validity
    const now = new Date();
    if (user.token_expiration < now) {
      // token has expired: delete the user record
      await sqlDeleteUser(user.id);
      return res.status(400).json({
        result: false,
        message: "Token has expired. Please signup again",
      });
    }
    // user successfully verified
    await sqlUpdateVerifiedUser(token);

    return res.redirect(
      `${process.env.PUBLIC_FRONTEND_URL}/auth/email-verified`
    );
  } catch (err) {
    console.error("Error during email verification:", err);
    return res
      .status(500)
      .json({ result: false, message: `Users database error :${err.message}` });
  }
});

// logout route
router.post("/logout", async (req, res) => {
  const cookies = req.cookies;
 
  if (cookies?.refreshToken) {
    // clear the refresh token on the client side
    const isProd = process.env.NODE_ENV === "production";
    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: isProd ? "none" : "lax",
      secure: isProd,
    });
  }
  return res.sendStatus(204); // no content
});

// route for users having forgotten their password
// send  a reset password link to the user's email
// return { result: boolean, message: string}
router.post("/forgot-password", async (req, res) => {
  const { isValid, missing } = checkBody(req.body, ["email"]);
  if (!isValid) {
    return res
      .status(400)
      .json({ result: false, message: `bad request : missing ${missing}` });
  }

  const { email } = req.body;
  try {
    // check if the user exists
    const user = await sqlFindUserByEmail(email);
    if (!user) {
      return res.status(404).json({ result: false, message: "User not found" });
    }
    if (!user.is_verified) {
      return res
        .status(403)
        .json({ result: false, message: "Please check your email address" });
    }
    // generate a reset password token
    const { token, token_expiration } = createVerificationToken(
      RESET_PASSWORD_TOKEN_DURATION
    );
    // save the token into the db
    const dbRes = await sqlUpdateUserToken(user.id, token, token_expiration);
    if (!dbRes.success) {
      return res.status(500).json({ result: false, message: dbRes.message });
    }
    // send an email with a reset password link
    // create a reset password link

    const resetPasswordLink = `${process.env.PUBLIC_FRONTEND_URL}/auth/reset-password/${token}`;
    // send welcome email message
    console.log("About to send email...");
    const emailRes = await sendEmailWithGmail(
      RESET_PASSWORD_SUBJECT,
      RESET_PASSWORD_MESSAGE(user.first_name, resetPasswordLink),
      email
    );
    console.log("Email result:", emailRes);
    return res.status(200).json({
      result: true,
      message: "Reset password E-mail sent. Please check your email",
    });
  } catch (err) {
    return res.status(500).json({ result: false, message: err.message });
  }
});

// reset password route :
// request body shall contain : token and new password
// retrieves the user from the input token : check that it's a
// verified user and that the token has not expired
// update the user's password in db and delete the token
// return { result: boolean, message: string}
router.post("/reset-password", async (req, res) => {
  const { isValid, missing } = checkBody(req.body, ["token", "password"]);
  if (!isValid) {
    return res
      .status(400)
      .json({ result: false, message: `bad request : missing ${missing}` });
  }
  const { token, password } = req.body;
  try {
    const user = await sqlFindUserByToken(token);
    if (!user) {
      return res.status(404).json({ result: false, message: "Invalid link" });
    }
    if (!user.is_verified || user.token_expiration < new Date()) {
      // user has not been verified yet or token has expired
      return res.status(403).json({
        result: false,
        message: "reset password link has expired or account not verified",
      });
    }
    // verification done, update the password after hashing
    const newPassword = await bcrypt.hash(password, 10);
    const response = await sqlUpdateUserPassWord(user.id, newPassword); // this also delete the token
    return res
      .status(200)
      .json({ result: true, message: "Password successfully updated" });
  } catch (err) {
    return res.status(500).json({ result: false, message: err.message });
  }
});

// refresh the user's access token if expired
router.post("/refresh_token", async (req, res) => {
  // get the refresh token
 /*  console.log("=== REFRESH TOKEN DEBUG ===");
  console.log("Headers:", req.headers);
  console.log("Cookie header:", req.headers.cookie);
  console.log("Parsed cookies:", req.cookies);
  console.log("RefreshToken:", req.cookies?.refreshToken); */
  const refreshToken = req.cookies?.refreshToken;
  if (!refreshToken) {
    // no cookie with refresh token in request
    return res
      .status(401)
      .json({ result: false, message: "No refresh token provided" });
  }

  // check and decode the refresh token
  const decoded = verifyToken(refreshToken, "refresh");

  if (!decoded) {
    return res
      .status(403)
      .json({ result: false, message: "Invalid or expired refresh token" });
  }
  console.log("decoded token: " , decoded);
  const userId = decoded.userId;
  console.log("user Id: " ,userId);
  const checkRes = await sqlCheckUser(userId);
  if (!checkRes.result) {
    return res.status(403).json({ result: false, message: "Invalid User" });
  }

  // generate a fresh acces token
  const newAccessToken = createToken(
    userId,
    ACCES_TOKEN_DURATION,
    "access",
    "m"
  );

  return res.status(200).json({ result: true, accessToken: newAccessToken });
});

module.exports = router;
