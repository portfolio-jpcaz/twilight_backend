var express = require("express");
var router = express.Router();
const { checkBody, getHashtagsFromText } = require("../modules/utils");
const {
  sqlCreateNewTweetWithHashtags,
  sqlGetLastTweets,
  sqlFindTweetById,
  sqlDeleteTweet,
  sqlFindLike,
  sqlAddLike,
  sqlDeleteLike
} = require("../db/queries");
const { MAX_NB_TWEETS } = require("../modules/constants");
// all routes require a token authentication
// this middleware function add the "user" field to the request : req.user that contains the user id
const { authenticateToken } = require("../modules/auth_utils");
router.use(authenticateToken);

// error classes
class NotAllowedError extends Error {}
class NotFoundError extends Error {}

function errHandling(err, res) {
  if (err instanceof NotAllowedError) {
    return res.status(403).json({ result: false, message: err.message });
  } else if (err instanceof NotFoundError) {
    return res.status(404).json({ result: false, message: err.message });
  } else {
    // Ici, on loggue le bug, et on envoie un message neutre à l'utilisateur
    console.error("Unexpected Error : ", err);
    return res.status(500).json({ result: false, message: "Server Error" });
  }
}
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
    const response = await sqlGetLastTweets(user, latestId, nbTweets); // get the last tweets data

    if (response.result) {
      // re-format the returned data
      const lastTweets = response.tweets.map((row) => {
        const {
          id,
          created_at,
          message,
          user_id,
          username,
          first_name,
          nb_likes,
          is_liked,
        } = row;
        // created_at timestamp becomes "since"
        const since = dayjs(created_at).fromNow();
        const tweet = {
          id,
          author: { id: user_id, username, firstName: first_name },
          message,
          since,
          nbLikes: nb_likes,
          liked: is_liked,
        };
        return tweet;
      });
      return res.status(200).json({ result: true, lastTweets });
    }
    return res.status(500).json(response);
  } catch (err) {
    return res.status(500).json({ result: false, message: err.message });
  }
});

// delete the tweet that has the input id
// side-effects : cascade delete of the likes et hashtags associations
// return { result : boolean, message: string}
// error cases : status 403 : user is not the author hence is not allowed to delete
//               status 404 : tweet wit input id does not exist
//               status 500 : db or http error
router.delete("/:id", async (req, res) => {
  const tweetId = req.params.id;
  const user = req.user; // logged in user id
  try {
    const tweet = await sqlFindTweetById(tweetId);
    if (!tweet) throw new NotFoundError("Error: Tweet does not exist");
    // only the author of a tweet can ask for its suppression
    if (tweet.author != user)
      throw new NotAllowedError("User Not allowed to delete this tweet");
    const delRes = await sqlDeleteTweet(tweetId);
    if (delRes.result) return res.status(200).json(delRes);
  } catch (err) {
    return errHandling(err, res);
  }
});
// add a like from logged-in user to the tweet with input id
// return { result: boolean, message : string}
// error cases : 403 user has already liked the tweet only one like allowed
//               404 tweet with input id does not exist
//               500 db or http error
router.post("/:id/like", async (req, res) => {
  const tweetId = req.params.id;
  const user = req.user; // logged in user id
  try {
    const tweet = await sqlFindTweetById(tweetId);
    if (!tweet) throw new NotFoundError("Error: Tweet does not exist");
    if (tweet.author == user)
      throw new NotAllowedError("Error : You cannot like your own tweet ");
    const like = await sqlFindLike(tweetId, user);
    if (like) throw new NotAllowedError("Error: Cannot like a tweet twice");
    const addLikeRes = await sqlAddLike(tweetId, user);
    return res.status(200).json({result:true, message : "like successfully removed"});
  } catch (err) {
    return errHandling(err, res);
  }
});
// remove the like of the tweet with input id
// return { result: boolean, message : string}
// error cases : 404 tweet with input id does not exist
//               404 like does not exist
//               500 db or http error
router.delete("/:id/like", async (req, res) => {
  const tweetId = req.params.id;
  const user = req.user; // logged in user id
  try {
    const tweet = await sqlFindTweetById(tweetId);
    if (!tweet) throw new NotFoundError("Error: Tweet does not exist");
    const like = await sqlFindLike(tweetId, user);
    if (!like) throw new NotFoundError("Error: You never liked this tweet");
    const delLikeRes= sqlDeleteLike(like.id);
    return res.status(200).json(delLikeRes);
  } catch (err) {
    return errHandling(err, res);
  }
});
module.exports = router;
