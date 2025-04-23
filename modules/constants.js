const APPLICATION_EMAIL = "TWILIGHT application admin";
const VERIFICATION_SUBJECT = "Please confirm your inscription to TWILIGHT";
const TOKEN_VALIDITY_DURATION = 24; // in hours
const WELCOME_MESSAGE = (verificationLink) => `<h1>Welcome to Twilight !</h1>
        <p>Thank you for registering. Please confirm your email by clicking on the link below</p>
        <a href="${verificationLink}">Confirm my email</a>
        <p>This link will expire after ${TOKEN_VALIDITY_DURATION} hours</p>`;

module.exports = {
  APPLICATION_EMAIL,
  VERIFICATION_SUBJECT,
  WELCOME_MESSAGE,
  TOKEN_VALIDITY_DURATION,
};
