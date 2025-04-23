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

// update of a  record from the input table.
// the record matches the condition WHERE column = value
// it's updated data are passed through the "data" parameter
// in the form of an object : the keys  of this object match the columns to be updated
async function sqlUpdateOneQuery(table, column, value, data) {
  try {
    const record = await sqlFindOnequery(table, column, value);
    if (!record) {
      return { success: false, error: `No such record in ${table} table` };
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
async function sqlFindUserByEmail(email) {
  return sqlFindOnequery("Users", "email", email);
}
async function sqlFindUserByName(username) {
  return sqlFindOnequery("Users", "username", username);
}
async function sqlFindUserByToken(token) {
  return sqlFindOnequery("Users", "token", token);
}

async function sqlCreateUser(data) {
  return sqlInsertOneQuery("Users", data);
}
async function sqlUpdateVerifiedUser(token) {
  return sqlUpdateOneQuery("Users", "token", token, {
    is_verified: true,
    token: null,
    token_expiration: null,
  });
}

async function sqlDeleteUser(id) {
  return sqlDeleteOnequery("Users", id);
}
module.exports = {
  sqlFindUserByEmail,
  sqlFindUserByName,
  sqlFindUserByToken,
  sqlUpdateVerifiedUser,
  sqlCreateUser,
  sqlDeleteUser,
};
