var express = require("express");
var router = express.Router();
const {sqlGetRecentTags} = require('../db/queries');
const {MAX_NB_HASHTAGS,  TWEETS_SAMPLE_SIZE}= require("../modules/constants");
// all routes require a token authentication
// this middleware function add the "user" field to the request : req.user that contains the user id
const { authenticateToken } = require("../modules/auth_utils");
router.use(authenticateToken);

// get the most popular hashtags present in the most recent tweets
router.get('/', async (req,res)=>{
  const dbres = await sqlGetRecentTags(MAX_NB_HASHTAGS, TWEETS_SAMPLE_SIZE);
  const status = dbres.result ? 200 : 500;
  return res.status(status).json(dbres);
});

module.exports = router;