var express = require("express");
var router = express.Router();
const { checkBody, sendEmailWithGmail } = require("../modules/utils");
const uid2 = require("uid2");
const bcrypt = require("bcrypt");

const {
  APPLICATION_EMAIL,
  VERIFICATION_SUBJECT,
  WELCOME_MESSAGE,
  TOKEN_VALIDITY_DURATION
} = require("../modules/constants");
const {
  sqlFindUserByEmail,
  sqlFindUserByName,
  sqlUpdateVerifiedUser,
  sqlCreateUser,
  sqlFindUserByToken,
  sqlDeleteUser,
} = require("../db/queries");

/* Create a new user into the database (Users Table) : Sign up */
router.post("/", async (req, res) => {
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
        .status(400)
        .json({ result: false, message: "User already exists" });
    }
    const existingEmail = await sqlFindUserByEmail(email);
    if (existingEmail) {
      return res
        .status(400)
        .json({
          result: false,
          message: "This email is used by another account",
        });
    }

    // create a new user
    // hash the password
    const hash = bcrypt.hashSync(password, 10);
    // create a token to identify the new user uniquely
    const token = uid2(32);
    // create the expiration datetime of the token
    const expiresAt= new Date();
    expiresAt.setHours(expiresAt.getHours()+TOKEN_VALIDITY_DURATION);
    const newUser = {
      username,
      email,
      first_name: firstname,
      password: hash,
      token,
      token_expiration: expiresAt

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
        WELCOME_MESSAGE(verificationLink),
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

router.post("/signin", (req, res) => {
  if (!checkBody(req.body, ["username", "password"])) {
    res.json({ result: false, error: "Missing or empty fields" });
    return;
  }

  User.findOne({ username: req.body.username }).then((data) => {
    if (data && bcrypt.compareSync(req.body.password, data.password)) {
      res.json({ result: true, firstname: data.firstname, token: data.token });
    } else {
      res.json({ result: false, error: "User not found or wrong password" });
    }
  });
});

// route to validate the signup through the verification link sent by email
router.get("/verify-email/:token", async (req, res) => {
  try {
    const { token } = req.params;
    // find the user from the token
    const user = await sqlFindUserByToken(token);
    if (!user){
      return res.status(400).json({
        result: false,
        message: "Invalid Verification Link"
      })
    }
    // check the token validity
    const now=new Date();
    if ( user.token_expiration < now ){
      // token has expired: delete the user record
      await sqlDeleteUser(user.id);
      return res.status(400).json({
        result: false,
        message: "Token has expired. Please signup again"
      })
    }
    // user successfully verified
    await sqlUpdateVerifiedUser(token);

    return res.redirect(`${process.env.PUBLIC_FRONTEND_URL}/auth/email-verified`)
  } catch (err) {
    console.error("Error during email verification:", err);
    return res
      .status(500)
      .json({ result: false, message: `Users database error :${err.message}` });
  }
});

router.get("/", function (req, res, next) {
  res.send("respond with a resource");
});

module.exports = router;
