require('dotenv').config(); 
var express = require('express');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var tweetsRouter = require ('./routes/tweets');
var app = express();
const cors = require('cors');
const path = require('path');
const logRoutes = require('./modules/debug_utils');

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

logRoutes(app);

module.exports = app;
