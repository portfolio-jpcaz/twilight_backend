const APPLICATION_EMAIL = "TWILIGHT application admin";
const VERIFICATION_SUBJECT = "Please confirm your inscription to TWILIGHT";
const LINK_VALIDITY_DURATION = 24; // in hours
const MAX_NB_TWEETS=20;
const WELCOME_MESSAGE = (
  firstname,
  verificationLink
) => `<h1>${firstname} Welcome to Twilight !</h1>
        <p>Thank you for registering. Please confirm your email by clicking on the link below</p>
        <a href="${verificationLink}">Confirm my email</a>
        <p>This link will expire after ${LINK_VALIDITY_DURATION} hours</p>`;
const RESET_PASSWORD_SUBJECT = "Twilight : Reinit your password";
const RESET_PASSWORD_MESSAGE = (
  firstname,
  resetPasswordLink
) => `<p>Hi ${firstname},</p>
<p>You forgot your password to the Twilight application:please click the link below to reinitialize your password :</p>
<a href="${resetPasswordLink}">Reset My Password</a>.
<p>This link will expire in ${RESET_PASSWORD_TOKEN_DURATION} hour.`;
const REFRESH_TOKEN_DURATION = 7; //days
const ACCES_TOKEN_DURATION = 1; // mn
const RESET_PASSWORD_TOKEN_DURATION = 1; //hour
module.exports = {
  APPLICATION_EMAIL,
  VERIFICATION_SUBJECT,
  WELCOME_MESSAGE,
  LINK_VALIDITY_DURATION,
  REFRESH_TOKEN_DURATION,
  ACCES_TOKEN_DURATION,
  RESET_PASSWORD_TOKEN_DURATION,
  RESET_PASSWORD_SUBJECT,
  RESET_PASSWORD_MESSAGE,
  MAX_NB_TWEETS
};
