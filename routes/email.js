var express = require('express');
var router = express.Router();

const fs = require('fs');
const nodemailer = require('nodemailer');
const config = JSON.parse(fs.readFileSync('./config.json'));

const Imap = require('imap'),
      inspect = require('util').inspect;
const { simpleParser } = require('mailparser');

const cheerio = require('cheerio');

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

/**
 * query mail in specific mailbox
 * query: ?mailbox=mailbox
 */
router.get('/', function (req, res, next) {
  const mailbox = req.query.mailbox;
  if (mailbox) {
    imap.once('ready', () => {
      imap.openBox(mailbox, true, (err, box) => {
        if (err) {
          res.statusCode = 500;
          res.json({msg: err.message});
          imap.end();
        } else {
          imap.search(['All', ['SINCE', new Date('2018-011-01')]], (err, results) => {
            if (err) {
              res.statusCode = 500;
              res.json({msg: err.message});
              imap.end();
            } else {
              let f = imap.fetch(results, {bodies: ''});
              let msgs = [];
              let promises = [];
              f.on('message', (msg, seqno) => {
                console.log('Message #%d', seqno);
                let prefix = `(#${seqno}) `;
                msg.on('body', (stream, info) => {
                  let promise = (function () {
                    return new Promise((resolve, reject) => {
                      simpleParser(stream, (err2, mail) => {
                        if (err2) {
                          console.log('Read mail executor error .....', err2);
                          reject();
                          return ;
                        }
                        // mail will have everything, create meaningful data from it.
                        // const fileName = `msg-${seqno}-body.txt`;
                        // const fullFilePath = path.join('<path to store>', dir, fileName);
                        const emailEnvolope = {};
                        emailEnvolope.from = mail.from.text;
                        emailEnvolope.date = mail.date;
                        emailEnvolope.to = mail.to.text;
                        emailEnvolope.subject = mail.subject;
                        // emailEnvolope.text = mail.text && mail.text.replace(/(\[(https|http):\/\/[\s\S]+?\])*/g, '').replace(/[\s]+/g, ' ').trim().slice(0, 30).replace(/(\n)+/g, ' ');
                        // emailEnvolope.html = mail.html;
                        emailEnvolope.attachments = [];
                        if (mail.html) {
                          let $ = cheerio.load(mail.html);
                          emailEnvolope.overview = $.text();
                        } else {
                          emailEnvolope.overview = mail.text && mail.text.replace(/(\[(https|http):\/\/[\s\S]+?\])*/g, '').replace(/[\s]+/g, ' ');  
                        }
                        emailEnvolope.overview = emailEnvolope.overview.trim().replace(/(\s)+/g, ' ').slice(0, 50);
    
                        // write attachments
                        for (let i = 0; i < mail.attachments.length; i += 1) {
                            const attachment = mail.attachments[i];
                            const { filename } = attachment;
                            emailEnvolope.attachments.push(filename);
                          //  fs.writeFileSync(path.join('<path to store>', dir, filename), attachment.content, 'base64'); // take encoding from attachment ?
                        }
                        // const contents = JSON.stringify(emailEnvolope);
                        // fs.writeFileSync(fullFilePath, contents);
                        // body = contents;
                        // console.log(body);
                        msgs.push(emailEnvolope);
                        resolve();
                        console.log('processing mail done....');
                      });
                      
                    });
                  })();
                  promises.push(promise);
                });
                msg.once('attributes', attrs => {
                  console.log(prefix + 'Attributes: %s', inspect(attrs, false, 8));
                });
                msg.once('end', () => {
                  console.log(prefix, 'Finished');
                  
                });
              });
              f.once('error', err => {
                console.log('Fetch error: ' + err);
                res.statusCode = 500;
                res.json({msg: err.message});
              });
              f.once('end', () => {
                console.log('Done fetching all messages!');
                Promise.all(promises).then(() => {
                  res.json({msg: msgs});
                });
                imap.end();
              });
            }
          });
        }
      });
    });
    imap.once('error', err => {
      res.statusCode = 500;
      res.json({msg: err.message});
    });
    imap.connect();
  } else {
    res.statusCode = 400;
    res.json({msg: 'mailbox should not be empty'});
  }
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
  let { from, to, cc, bcc, subject, text, html } = req.body;
  if (from && to) {
    let mailOptions = {
      from, // sender address
      to, // list of receivers
      cc,
      bcc,
      subject, // Subject line
      text, // plain text body
      html // html body
    };
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
  
});
router.put('/', function (req, res, next) {

});
router.delete('/', function (req, res, next) {

});

module.exports = router;