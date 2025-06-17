var express = require("express");
var router = express.Router();
const { checkBody, getHashtagsFromText } = require("../modules/utils");
const {
  sqlCreateNewTweetWithHashtags,
  sqlGetLastTweets,
} = require("../db/queries");
const { MAX_NB_TWEETS } = require("../modules/constants");
// all routes require a token authentication
// this middleware function add the "user" field to the request : req.user that contains the user id
const { authenticateToken } = require("../modules/auth_utils");
router.use(authenticateToken);

// Créez un wrapper autour de votre fonction
// create a new tweet in the "Tweets table"
// author is : loggedIn user (read from authentication token)
// creation date is now() by default
// expected parameter is "message" : the tweet message itself
// get the hashtags from the message : create of find the hashtags inthe hastags table
// create the tweet -> hashtags associations in the TweetHashTags table
// return {result:boolean, message: string}
router.post("/new", async (req, res) => {
  const { isValid, missing } = checkBody(req.body, ["message"]);
  if (!isValid) {
    return res.status(400).json({ error: `bad request : missing ${missing}` });
  }
  // get the hashtags contained into teh message
  const { message } = req.body;
  const author = req.user;
  const hashtags = getHashtagsFromText(message);
  const dbres = await sqlCreateNewTweetWithHashtags(author, message, hashtags);
  const status = dbres.result ? 201 : 500;
  return res.status(status).json(dbres);
});

// Get the last tweets that have been recently published
// if "since" (id of latest downloaded tweet) is specified, 
// the tweets are returned only if new tweets have been created
// since the most recent downloaded tweet 
// query parameters :
// since : id of the latest downloaded tweet
// nbMaxTweets : max number of tweets to be returned
// returns
// { result: boolean,
//   tweets: [  {
//     id: number,
//     author: { user: string, firstName: string },
//     message: string,
//     since: string,
//     nbLikes: number,
//     liked: boolean,
//   },...]}
// (tweets can be empty if no recent tweets have ben created)
router.get("/", async (req, res) => {
  const nbTweets = parseInt(req.query.nbMaxTweets, 10) || MAX_NB_TWEETS; // valeur par défaut
  const latestId = parseInt(req.query.since, 10);
  const dayjs = require("dayjs");
  const relativeTime = require("dayjs/plugin/relativeTime");
  dayjs.extend(relativeTime);
  try {
    const user = req.user; // logged in user id
    const response = await sqlGetLastTweets(user,latestId, nbTweets); // get the last tweets data

    if (response.result) {
      // re-format the returned data
      const lastTweets = response.tweets.map((row) => {
        const {
          id,
          created_at,
          message,
          username,
          first_name,
          nb_likes,
          is_liked,
        } = row;
        // created_at timestamp becomes "since"
        const since = dayjs(created_at).fromNow();
        const tweet = {
          id,
          author: { username, firstName: first_name },
          message,
          since,
          nbLikes: nb_likes,
          liked: is_liked,
        };
        return tweet;
      });
      return res.status(200).json({ result:true, lastTweets});
    } 
    return res.status(500).json(response)
  } catch (err) {
    return res.status(500).json({result:false, message:err.message});
  }
});

module.exports = router;
