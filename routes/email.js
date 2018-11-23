var express = require('express');
var router = express.Router();

const fs = require('fs');
const nodemailer = require('nodemailer');
const config = JSON.parse(fs.readFileSync('./config.json'));

const Imap = require('imap'),
      inspect = require('util').inspect;
const { simpleParser } = require('mailparser');

const cheerio = require('cheerio');

const store = require('../utils/storage_job').getInstance();
const { hasAttachments, combineMailbox } = require('./utils');

// receive
const imap = new Imap({
  user: config.user,
  password: config.pass,
  host: 'imap-mail.outlook.com',
  port: 993,
  tls: true
});

router.get('/:uid', function (req, res, next) {
  const uid = req.params.uid;
  const mailbox = req.query.mailbox;
  if (uid) {
    if (!mailbox) {
      res.statusCode = 400;
      res.json('both uid and mailbox should not be empty');
      return ;
    }
    imap.once('ready', () => {
      imap.openBox(mailbox, true, (err, box) => {
        if (err) {
          res.statusCode = 500;
          res.json({msg: err.message});
          imap.end();
        } else {
          imap.search(['All', ['UID', `${uid}:${uid}`]], (err, uids) => {
            if (err) {
              res.statusCode = 500;
              res.json({msg: err.message});
              imap.end();
            } else {
              if (uids.length == 0) {
                res.json({msg: null});
                imap.end();
                return;
              }
              let f = imap.fetch(uids, {
                bodies: ''
              });
              let promise;
              f.on('message', (msg, seqno) => {
                console.log('Message #%d', seqno);
                let prefix = `(#${seqno}) `;
                const emailEnvolope = {};

                msg.on('body', (stream, info) => {
                  promise = (function () {
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
                        emailEnvolope.seq = seqno;
                        emailEnvolope.from = mail.from.text;
                        emailEnvolope.date = mail.date;
                        emailEnvolope.to = mail.to.text;
                        emailEnvolope.subject = mail.subject;
                        emailEnvolope.text = mail.text;
                        emailEnvolope.html = mail.html;
                        emailEnvolope.attachments = [];
                        
                        // write attachments
                        for (let i = 0; i < mail.attachments.length; i += 1) {
                          const attachment = mail.attachments[i];
                          const { filename, size, contentType, checksum, content: buffer } = attachment;
                          let fileRef = store.add({
                            filename, buffer, contentType, checksum
                          });
                          emailEnvolope.attachments.push({
                            filename, size, contentType, fileRef
                          });
                          //  fs.writeFileSync(path.join('<path to store>', dir, filename), attachment.content, 'base64'); // take encoding from attachment ?
                        }
                        // const contents = JSON.stringify(emailEnvolope);
                        // fs.writeFileSync(fullFilePath, contents);
                        resolve(emailEnvolope);
                        console.log('processing mail done....');
                      });
                      
                    });
                  })();
                });
                msg.once('attributes', attrs => {
                  let attr = inspect(attrs, false, 8);
                  console.log(prefix + 'Attributes: %s', attr);
                  emailEnvolope.uid = attrs.uid;
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
                Promise.race([promise, new Promise(resolve => {
                  let timer = setTimeout(() => {
                    resolve();
                    clearTimeout(timer);
                  }, 30 * 1000);
                })]).then((msg) => {
                  res.json({msg});
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
    next();
  }
});
/**
 * query mail in specific mailbox
 * query: ?mailbox=mailbox
 */
router.get('/', function (req, res, next) {
  const mailbox = req.query.mailbox;
  const flags = req.query.flags;
  const queries = req.query.queries.split('|').map(q => q.split(','));
  if (mailbox && flags) {
    imap.once('ready', () => {
      imap.openBox(mailbox, true, (err, box) => {
        if (err) {
          res.statusCode = 500;
          res.json({msg: err.message});
          imap.end();
        } else {
          imap.search([flags, ...queries], (err, results) => {
            if (err) {
              res.statusCode = 500;
              res.json({msg: err.message});
              imap.end();
            } else {
              if (results.length == 0) {
                res.json({msg: null});
                imap.end();
                return;
              }
              let f = imap.fetch(results, {
                struct: true, 
                envelope: true,
                // bodies: ['HEADER']
              });
              let msgs = [];
              let promises = [];
              f.on('message', (msg, seqno) => {
                console.log('Message #%d', seqno);
                let prefix = `(#${seqno}) `;
                const emailEnvolope = {};
                emailEnvolope.seq = seqno;
                msgs.push(emailEnvolope);

                // msg.on('body', (stream, info) => {
                  // let promise = (function () {
                  //   return new Promise((resolve, reject) => {
                  //     let body = '';
                  //     stream.on('data', chunk => {
                  //       body += chunk;
                  //     });
                  //     stream.on('end', () => {
                  //       console.log(body);
                  //       resolve();
                  //     });
                  //   });
                  // })();
                  // let promise = (function () {
                  //   return new Promise((resolve, reject) => {
                  //     simpleParser(stream, (err2, mail) => {
                  //       if (err2) {
                  //         console.log('Read mail executor error .....', err2);
                  //         reject();
                  //         return ;
                  //       }
                  //       // emailEnvolope.seq = seqno;
                  //       // emailEnvolope.from = mail.from.text;
                  //       // emailEnvolope.date = mail.date;
                  //       // emailEnvolope.to = mail.to.text;
                  //       // emailEnvolope.subject = mail.subject;
                  //       // emailEnvolope.attachments = [];
                  //       // if (mail.html) {
                  //       //   let $ = cheerio.load(mail.html);
                  //       //   emailEnvolope.overview = $.text();
                  //       // } else {
                  //       //   emailEnvolope.overview = mail.text && mail.text.replace(/(\[(https|http):\/\/[\s\S]+?\])*/g, '').replace(/[\s]+/g, ' ');  
                  //       // }
                  //       // if (emailEnvolope.overview) {
                  //       //   emailEnvolope.overview = emailEnvolope.overview.trim().replace(/(\s)+/g, ' ').slice(0, 50);
                  //       // } else {
                  //       //   emailEnvolope.overview = '';
                  //       // }
                  //       // msgs.push(emailEnvolope);
                  //       resolve();
                  //       console.log('processing mail done....');
                  //     });
                      
                  //   });
                  // })();
                //   promises.push(promise);
                // });
                msg.once('attributes', attrs => {
                  let attr = inspect(attrs, false, 8);
                  console.log(prefix + 'Attributes: %s', attr);
                  emailEnvolope.hasAttachments = hasAttachments(attrs.struct);
                  emailEnvolope.from = combineMailbox(attrs.envelope.from);
                  emailEnvolope.date = attrs.envelope.date;
                  emailEnvolope.to = combineMailbox(attrs.envelope.to);
                  emailEnvolope.cc = combineMailbox(attrs.envelope.cc);
                  emailEnvolope.bcc = combineMailbox(attrs.envelope.bcc);
                  emailEnvolope.subject = attrs.envelope.subject;
                  emailEnvolope.uid = attrs.uid;
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
                // Promise.race([Promise.all(promises), new Promise(resolve => {
                //   let timer = setTimeout(() => {
                //     resolve();
                //     clearTimeout(timer);
                //   }, 30 * 1000);
                // })]).then(() => {
                //   res.json({msg: msgs.sort((a, b) => {
                //     return a.seq < b.seq;
                //   })});
                // });
                res.json({msg: msgs.sort((a, b) => {
                  return b.seq - a.seq;
                })});
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
});

router.post('/', function (req, res, next) {
  let { from, to, cc, bcc, subject, text, html, attachments } = req.body;
  if (from && to) {
    let mailOptions = {
      from, // sender address
      to, // list of receivers
      cc,
      bcc,
      subject, // Subject line
      text, // plain text body
      html, // html body
      attachments
    };
    // send
    let transporter = nodemailer.createTransport({
      pool: true,
      host: 'smtp-mail.outlook.com',
      port: 587,
      secure: false,
      auth: config
    });
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        res.statusCode = 500;
        res.json({msg: err.message});
        return ;
      }
      res.statusCode = 201;
      res.end();
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
router.post('/:uid/position', function (req, res, next) {
  let uid = req.params.uid;
  let originMailbox = req.query.from;
  let distMailbox = req.query.to;
  if (uid && originMailbox && distMailbox) {
    uid = parseInt(uid);
    imap.once('ready', () => {
      imap.openBox(originMailbox, false, (err, box) => {
        if (err) {
          res.statusCode = 500;
          res.json({msg: err.message});
          return ;
        }
        imap.move([uid], distMailbox, err => {
          if (err) {
            res.statusCode = 500;
            res.json({msg: err.message});
            return ;
          }
          res.statusCode = 201;
          res.end();
        });
      });
    });
    imap.once('error', err => {
      res.statusCode = 500;
      res.json({msg: err.message});
    });
    imap.connect();
  } else {
    res.statusCode = 400;
    res.json({
      msg: 'uid, from, to should not be empty'
    });
  }
});
router.delete('/:uid', function (req, res, next) {
  let uid = req.params.uid;
  let mailbox = req.query.mailbox;
  if (uid && mailbox) {
    uid = parseInt(uid);
    imap.once('ready', () => {
      imap.openBox(mailbox, false, (err, box) => {
        if (err) {
          res.statusCode = 500;
          res.json({msg: err.message});
          return ;
        }
        imap.move([uid], 'Deleted', err => {
          if (err) {
            res.statusCode = 500;
            res.json({msg: err.message});
            return ;
          }
          res.statusCode = 201;
          res.end();
        });
      });
    });
    imap.once('error', err => {
      res.statusCode = 500;
      res.json({msg: err.message});
    });
    imap.connect();
  } else {
    res.statusCode = 400;
    res.json({
      msg: 'uid, mailbox should not be empty'
    });
  }
});

module.exports = router;