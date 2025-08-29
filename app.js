require('dotenv').config(); 
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var tweetsRouter = require ('./routes/tweets');
var hashtagsRouter= require('./routes/hashtags');

var app = express();
const cors = require('cors');
const path = require('path');
const logRoutes = require('./modules/debug_utils');
const pool = require("./db/db");
app.use(cors({
  origin: process.env.PUBLIC_FRONTEND_URL, 
  credentials: true               // allow httponly cookies in requests
}));
console.log (`frontend: ${process.env.PUBLIC_FRONTEND_URL}`)
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/tweets', tweetsRouter);
app.use('/hashtags', hashtagsRouter);

logRoutes(app);
app.get('/health', async (req, res) => {
  try {
    const r = await pool.query('SELECT 1 AS ok');
    res.json({ status: 'ok', db: r.rows[0].ok });
  } catch (e) {
    res.status(500).json({ status: 'db_error', code: e.code, message: e.message });
  }
});


module.exports = app;
