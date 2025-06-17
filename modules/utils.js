// BACKEND utilities

const nodemailer = require("nodemailer");
const {APPLICATION_EMAIL} = require("./constants");

// email service configuration
const transporter = nodemailer.createTransport({
  service: "gmail", // ou un autre service
  auth: {
    user: process.env.EMAIL_ADMIN,
    pass: process.env.ADMIN_PASSWD,
  },
});

// send an email from a gmail address
async function sendEmailWithGmail(
  subject,
  message,
  to,
  from = `"${APPLICATION_EMAIL}" <${process.env.EMAIL_ADMIN}>`
) {
  if (!from.includes("@gmail.com")) {
    return { sent: false, err: "please use a gmail address to send the email" };
  }
  const mailOptions = {
    from,
    to,
    subject,
    html: message,
  };
  // send email
  try {
    await transporter.sendMail(mailOptions);
    return { sent: true };
  } catch (err) {
    return { sent: false, err: err.message };
  }
}


// analyze the content of the input request's body
// if all the expected input keys are there 
// isValid=true 
// else isValid=false and missing contains the name of the first missing key
function checkBody(body, keys) {
  let isValid = true;
  let missing = null;
  for (const field of keys) {
    if (!body[field] || body[field] === "") {
      isValid = false;
      missing = field;
    }
  }

  return { isValid, missing };
}

// return the array of hastags found in the input text
// if no hashtag found , return null
function getHashtagsFromText(text) {
  const pattern = /#\w+/gi;
  return text.match(pattern);
}

module.exports = { checkBody, getHashtagsFromText, sendEmailWithGmail };
