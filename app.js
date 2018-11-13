var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

// var indexRouter = require('./routes/index');
// var usersRouter = require('./routes/users');

var emailRouter = require('./routes/email');
var emailBox = require('./routes/email_box');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));

app.use('/mails', emailRouter);
app.use('/mail_boxes', emailBox);
// app.use('/', indexRouter);
// app.use('/users', usersRouter);

module.exports = app;
