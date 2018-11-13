var express = require('express');
var router = express.Router();

const fs = require('fs');
const nodemailer = require('nodemailer');
const config = JSON.parse(fs.readFileSync('./config.json'));

const Imap = require('imap'),
      inspect = require('util').inspect;

// receive
const imap = new Imap({
  user: config.user,
  password: config.pass,
  host: 'imap-mail.outlook.com',
  port: 993,
  tls: true
});
// send
let transporter = nodemailer.createTransport({
  pool: true,
  host: 'smtp-mail.outlook.com',
  port: 587,
  secure: false,
  auth: config
});
// imap.once('ready', function() {
//   imap.on('mail', function(numNewMsgs) {
//     console.log('new msgs arrived: ', numNewMsgs);
//   });
//   imap.getBoxes(function(err, boxes) {
//     console.log(boxes);
//   });
// });
// imap.connect();

router.get('/', function (req, res, next) {
  // imap.once('ready', function () {
  //   imap.openBox('INBOX', true, function (err, box) {
  //     if (err) throw err;
  //     // imap.search([ 'UNSEEN', ['SINCE', 'September 1, 2018'] ], function(err, results) {
  //     //   if (err) throw err;
  //     //   var f = imap.fetch(results, { bodies: '' });
  //     //   f.on('message', function(msg, seqno) {
  //     //     console.log('Message #%d', seqno);
  //     //     var prefix = '(#' + seqno + ') ';
  //     //     msg.on('body', function(stream, info) {
  //     //       console.log(prefix + 'Body');
  //     //       stream.pipe(fs.createWriteStream('msg-' + seqno + '-body.txt'));
  //     //     });
  //     //     msg.once('attributes', function(attrs) {
  //     //       console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
  //     //     });
  //     //     msg.once('end', function() {
  //     //       console.log(prefix + 'Finished');
  //     //     });
  //     //   });
  //     //   f.once('error', function(err) {
  //     //     console.log('Fetch error: ' + err);
  //     //   });
  //     //   f.once('end', function() {
  //     //     console.log('Done fetching all messages!');
  //     //     imap.end();
  //     //   });
  //     // });

  //     var f = imap.seq.fetch('1:3', {
  //       bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
  //       struct: true
  //     });
  //     f.on('message', function(msg, seqno) {
  //       console.log('Message #%d', seqno);
  //       var prefix = '(#' + seqno + ') ';
  //       msg.on('body', function(stream, info) {
  //         var buffer = '';
  //         stream.on('data', function(chunk) {
  //           buffer += chunk.toString('utf8');
  //         });
  //         stream.once('end', function() {
  //           console.log(prefix + 'Parsed header: %s', inspect(Imap.parseHeader(buffer)));
  //         });
  //       });
  //       msg.once('attributes', function(attrs) {
  //         console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
  //       });
  //       msg.once('end', function() {
  //         console.log(prefix + 'Finished');
  //       });
  //     });
  //     f.once('error', function(err) {
  //       console.log('Fetch error: ' + err);
  //       res.json({name: 'fail'});
  //     });
  //     f.once('end', function() {
  //       console.log('Done fetching all messages!');
  //       imap.end();
  //     });
  //   });

  // });
  // imap.once('error', function (err) {
  //   console.log(err);
  //   res.json({name: 'fail'});
  // });
  // imap.once('end', function () {
  //   console.log('connection ended');
  //   res.json({name: 'ok'});
  // });
  // imap.connect();
});
router.get('/:id', function (req, res, next) {
  
});
router.post('/', function (req, res, next) {
  let mailOptions = {
    from: `Fred Foo <${config.user}>`, // sender address
    to: 'xiekun@f3dt.com', // list of receivers
    cc: 'xiekun@f3dt.com',
    bcc: 'xiekun@f3dt.com',
    subject: 'Hello ✔', // Subject line
    text: 'Hello world?', // plain text body
    html: '<b>Hello world? this is a test for nodemailer</b>' // html body
  }
  // transporter.verify(function (error, success) {
  //   if (error) {
  //     console.log(error);
  //     res.json({name: 'fail'});
  //   } else {
  //     console.log('Server is ready to take our messages');
  //     res.json({name: 'ok'});
  //   }
  // });
  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      res.json({name: 'fail'});
      return console.log(err);
    }
    console.log('Message sent: %s', info.messageId);
    // Preview only available when sending through an Ethereal account
    console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    res.json({name: 'ok', accepted: info.accepted, rejected: info.rejected});
  });
  
});
router.put('/', function (req, res, next) {

});
router.delete('/', function (req, res, next) {

});

module.exports = router;