// --------------- implementations of the backend's ------------
// --------------- queries to the twilight db       ------------
//

const pool = require("./db");

// ----------- UTILITIES ----------------------

// utility to prepare a sql query
// from an object { key1: value1, key2: value2,...,keyn:valuen}
// returns : columns = "key1, key2, ...keyn"
//           placeholders : "$1, $2,..., $n"
//           values : [value1, value2, ..., valuen]
function prepareQueryParams(data) {
  const keys = Object.keys(data);
  const values = Object.values(data);

  const columns = keys.join(", ");
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");

  return { columns, placeholders, values };
}

// utility to log and propagate an error related to a sql query
function throwSqlError(err, customMessage = "Database query failed") {
  console.error("Error details:", err);
  console.error("Error code:", err.code);
  console.error("Error message:", err.message);
  console.error("Error stack:", err.stack);
  throw new Error(customMessage);
}

// ----------- generic queries ---------------------

// generic query find one item in a table where column=value
// return the full record if found, null otherwise
async function sqlFindOnequery(table, column, value) {
  // the search query
  const findQuery = `SELECT * from "${table}" WHERE ${column}= $1 LIMIT 1`;
  try {
    const res = await pool.query(findQuery, [value]);
    return res.rows[0] || null;
  } catch (err) {
    throwSqlError(err, "Database findOne query failed");
  }
}
async function sqlGetOrderedRecords(table, filterCol, ascending, limit) {
  const order = ascending ? "ASC" : "DESC";
  const getQuery = `SELECT * from ${table} ORDER BY ${filterCol} ${order} LIMIT $1`;
  try {
    const result = await pool.query(getQuery, limit);
    return { rows: result.rows };
  } catch (err) {
    throwSqlError(err, "Database insertion query failed");
  }
}

// insertion of a new record into a table. the data of the new record are passed through the "data" parameter
// in the form of an object : the keys  of this object match the columns of the table
async function sqlInsertOneQuery(table, data) {
  const { columns, placeholders, values } = prepareQueryParams(data);
  // the record creation query
  const query = `INSERT INTO "${table}" (${columns}) VALUES (${placeholders}) RETURNING *`;

  try {
    const result = await pool.query(query, values);
    return { success: true, row: result.rows[0] };
  } catch (err) {
    throwSqlError(err, "Database insertion query failed");
  }
}

// shortcut for : findOne in table if not found insertOne
// parameters :
// the name of the db table
// data : an object containing the data of the object to be found or created
//        {column1:value1, ..;, column n: valuen }
// key : the name of the column for the search criterion
// return : { result: true , id : id of the created/found object }
//         or {result: false , message : string}
async function sqlFindOrCreateOneQuery(table, data, key) {
  try {
    let res = await sqlFindOnequery(table, key, data[key]);
    let id;
    if (!res) {
      // record not found, create a new record into the table
      res = await sqlInsertOneQuery(table, data);
      if (res.success) {
        id = res.row.id;
      }
    } else {
      // record found
      id = res.id;
    }
    return { result: true, id };
  } catch (err) {
    return { result: false, message: err.message };
  }
}
// update of a  record from the input table.
// the record matches the condition WHERE column = value
// it's updated data are passed through the "data" parameter
// in the form of an object : the keys  of this object match the columns to be updated
async function sqlUpdateOneQuery(table, column, value, data) {
  try {
    const record = await sqlFindOnequery(table, column, value);
    if (!record) {
      return { success: false, message: `No such record in ${table} table` };
    }
    console.log(`found record : ${JSON.stringify(record)}`);
    const { columns, placeholders, values } = prepareQueryParams(data);
    const query = `UPDATE "${table}" SET (${columns}) = (${placeholders}) WHERE id = ${record.id}`;
    console.log(query);
    await pool.query(query, values);
    return {
      success: true,
      message: `record id: ${record.keys} successfully updated`,
    };
  } catch (err) {
    throwSqlError(err, "Database update query failed");
  }
}
// generic query to delete a record in a Table knowing its id
// return the number of deleted records : 1 if successful 0 otherwise
async function sqlDeleteOnequery(table, id) {
  // the delete query
  const deleteQuery = `DELETE  from "${table}" WHERE id = $1`;
  try {
    const res = await pool.query(deleteQuery, [id]);
    return res.rowCount;
  } catch (err) {
    throwSqlError(err, "Database deleteOne query failed");
  }
}

// ------------ specific queries ----------

// ------------ "Users" table  specific queries ----------------

// return the user's record knowing its email. throw an exception if not found
async function sqlFindUserByEmail(email) {
  return sqlFindOnequery("Users", "email", email);
}
// return the user's record knowing its username. throw an exception if not found
async function sqlFindUserByName(username) {
  return sqlFindOnequery("Users", "username", username);
}
//  return the user's record knowing its verification token. throw an exception if not found
async function sqlFindUserByToken(token) {
  return sqlFindOnequery("Users", "token", token);
}

// find the user with the input id and returns {result:true, message""} if the user has been verified
async function sqlCheckUser(id) {
  try {
    const user = await sqlFindOnequery("Users", "id", id);
    if (!user.is_verified) {
      throw new Error();
    }
    return { result: true, message: "" };
  } catch (err) {
    return { result: false, message: "User not valid" };
  }
}
// create a new user with the input data
async function sqlCreateUser(data) {
  return sqlInsertOneQuery("Users", data);
}

// on user's verification, this function is called to update the user's record
// to mark the user as "verified"
async function sqlUpdateVerifiedUser(token) {
  return sqlUpdateOneQuery("Users", "token", token, {
    is_verified: true,
    token: null,
    token_expiration: null,
  });
}

async function sqlUpdateUserToken(id, token, token_expiration) {
  return sqlUpdateOneQuery("Users", "id", id, {
    token,
    token_expiration,
  });
}
// change the user password
async function sqlUpdateUserPassWord(id, password) {
  return sqlUpdateOneQuery("Users", "id", id, {
    password,
    token: null,
    token_expiration: null,
  });
}
async function sqlDeleteUser(id) {
  return sqlDeleteOnequery("Users", id);
}

// --------------- "Tweets" table  specific queries -----------

// create a new tweet and related hashtags if new hastags
// create the tweet - hashtags associations
async function sqlCreateNewTweetWithHashtags(author, message, hashtags) {
  const newTweet = {
    author,
    message,
  };
  try {
    // create a new tweet in the Tweets table
    const res = await sqlInsertOneQuery("Tweets", newTweet);
    const record = res.row;
    const tweet = record.id;
    // loop on the hashtags
    if (hashtags) {
      for (const hashtag of hashtags) {
        const response = await sqlFindOrCreateOneQuery(
          "Hashtags",
          { hashtag },
          "hashtag"
        );
        if (response.result) {
          // create the association in the TweetsHashTags table
          const assoc = { tweet, hashtag: response.id };
          await sqlInsertOneQuery("TweetsHashtags", assoc);
        } else {
          return response;
        }
      }
    }
    return { result: true, message: `new tweet created with id ${tweet}` };
  } catch (err) {
    return { result: false, message: err.message };
  }
}
// get the nbTweets latest tweets, returned data includes the number of Likes for each tweet
// as well as a boolean that is true if the tweet was liked by the logged in user
// the tweets are returned only if new tweets have been created since the tweet with id "latestTweetId"
// (usually obtained from a previous call)
// return { result: true, tweets : [ {tweet id, tweet.created_at, tweet.message, author: {username, first_name}, nbLikes, is_liked}]}
// if error returns { result: false, message : string }
async function sqlGetLastTweets(loggedInUserId, latestTweetId, nbTweets) {
  // complex query that lists the latest tweets (order by created_at desc)
  // for each tweet add a column that calculates the number of likes (joint on likes table)
  // add another boolean column  (number of times when logged in user is part of the likes >0)
  const query = `select Tweets.id, Tweets.created_at, Tweets.message, 
                        Users.id as user_id, Users.username, Users.first_name,
                        COUNT(Likes.id) as nb_likes ,
                        COUNT(Likes.id) FILTER (WHERE Likes.user = $1) > 0 AS is_liked
                  from "Tweets" as Tweets 
                  left join "Likes" as Likes on Tweets.id = Likes.tweet 
                  JOIN "Users" as Users on  Users.id = Tweets.author 
                  WHERE EXISTS( SELECT 1 From "Tweets" where id >$2 )
                  GROUP BY Tweets.id,Users.id,Users.username,Users.first_name
                  order by Tweets.created_at DESC
                  LIMIT $3`;
  try {
    const res = await pool.query(query, [
      loggedInUserId,
      latestTweetId,
      nbTweets,
    ]);
    return { result: true, tweets: res.rows || [] };
  } catch (err) {
    return { result: false, message: err.message };
  }
}

// find the tweet with input id
// returns the tweet record if found, NULL otherwise
async function sqlFindTweetById(id) {
  return sqlFindOnequery("Tweets", "id", id);
}

// delete the tweet with the input id
// this has the effect of deleting the tweet-likes and the tweet-hashtag
// associations.
// if orphan hashtags remain after the suppression of the tweet, these
// hashtags are deleted as well
async function sqlDeleteTweet(tweetId) {
  try {
    const res = await sqlDeleteOnequery("Tweets", tweetId);
    // the above query also deletes the likes and tweetshashtags as an effect
    // of on delete cascade cosntraints
    const cleanupQuery =
      'DELETE FROM "Hashtags" WHERE id NOT IN \
         (SELECT DISTINCT hashtag FROM "TweetsHashtags")';
    const cleanupRes = await pool.query(cleanupQuery);
    return {
      result: true,
      message: `tweet with id ${tweetId} has been deleted`,
    };
  } catch (err) {
    console.log(err);
    throw new Error(err.message);
  }
}

module.exports = {
  sqlFindUserByEmail,
  sqlFindUserByName,
  sqlFindUserByToken,
  sqlUpdateVerifiedUser,
  sqlUpdateUserToken,
  sqlUpdateUserPassWord,
  sqlCreateUser,
  sqlDeleteUser,
  sqlCreateNewTweetWithHashtags,
  sqlCheckUser,
  sqlGetLastTweets,
  sqlFindTweetById,
  sqlDeleteTweet,
};
