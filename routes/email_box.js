const express = require('express');
const router = express.Router();
const fs = require('fs');
const resolvePath = require('./utils').resolvePath;
const recurseBox = require('./utils').recurseBox;

const config = JSON.parse(fs.readFileSync('./config.json'));

const Imap = require('imap');
const imap = new Imap({
  user: config.user,
  password: config.pass,
  host: 'imap-mail.outlook.com',
  port: 993,
  tls: true
});

router.get('/', (req, res) => {
  imap.once('ready', () => {
    imap.getBoxes((err, boxes) => {
      if (err) {
        res.statusCode = 500;
        res.json({
          msg: err.message
        });
      } else {
        res.json({
          msg: recurseBox(boxes)
        });
      }
    });
  });
  imap.once('error', err => {
    res.statusCode = 500;
    res.json({
      msg: err.message
    });
  });
  imap.connect();
});
router.get('/:id', (req, res) => {

});
router.post('/', (req, res) => {
  const { mailboxParentName, mailboxName } = req.body;
  if (mailboxName) {
    let path = resolvePath(mailboxParentName, mailboxName);
    imap.once('ready', () => {
      imap.addBox(path, err => {
        if (err) {
          res.statusCode = 500;
          res.json({
            msg: err.message
          });
        } else {
          res.statusCode = 201;
          res.end();
        }
      });
    });
    imap.once('error', err => {
      res.statusCode = 500;
      res.json({
        msg: err.message
      });
    });
    imap.connect();
  } else {
    res.statusCode = 400;
    res.json({
      msg: 'mailboxName should not be empty'
    });
  }
});
router.put('/:id', (req, res) => {
  // imap.once('ready', () => {
  //   imap.renameBox(oldMailboxName, newMailboxName, (err, box) => {
  //     if (err) {
  //       res.statusCode = 500;
  //       res.json({msg: err.message});
  //     } else {
  //       res.json();
  //     }
  //   });
  // });
});
router.delete('/', (req, res) => {
  const { mailboxParentName, mailboxName } = req.query;
  if (mailboxName) {
    let path = resolvePath(mailboxParentName, mailboxName);
    imap.once('ready', () => {
      imap.delBox(path, (err, box) => {
        if (err) {
          res.statusCode = 500;
          res.json({msg: err.message});
        } else {
          res.end();
        }
      });
    });
    imap.once('error', err => {
      res.statusCode = 500;
      res.json({
        msg: err.message
      });
    });
    imap.connect();
  } else {
    res.statusCode = 400;
    res.json({
      msg: 'mailboxName should not be empty'
    });
  }
});

module.exports = router;