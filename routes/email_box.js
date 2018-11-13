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

/**
 * list all mailboxes
 */
router.get('/', (req, res, next) => {
  if (req.query.mailbox) {
    next();
  } else {
    imap.once('ready', () => {
      imap.getBoxes((err, boxes) => {
        if (err) {
          res.statusCode = 500;
          res.json({
            msg: err.message
          });
          imap.end();
        } else {
          res.json({
            msg: recurseBox(boxes)
          });
          imap.end();
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
  }
});
/**
 * get mailbox detail
 * query: ?mailbox=path/to/mailbox
 */
router.get('/', (req, res) => {
  const mailbox = req.query.mailbox;
  if (mailbox) {
    imap.once('ready', () => {
      imap.status(mailbox, (err, box) => {
        if (err) {
          res.statusCode = 500;
          res.json({
            msg: err.message
          });
          imap.end();
        } else {
          res.json({msg: box});
          imap.end();
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
    res.json({
      msg: 'mailbox should not be empty'
    });
  }
});
/**
 * create mailbox
 * body: {path: path/to/mailbox}
 */
router.post('/', (req, res) => {
  const { path } = req.body;
  if (path) {
    imap.once('ready', () => {
      imap.addBox(path, err => {
        if (err) {
          res.statusCode = 500;
          res.json({
            msg: err.message
          });
          imap.end();
        } else {
          res.statusCode = 201;
          res.end();
          imap.end();
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
/**
 * rename mailbox
 * query: ?oldMailboxName=path/to/old
 * body: {newMailboxName: 'path/to/new'}
 */
router.put('/', (req, res) => {
  const oldMailboxName = req.query.oldMailboxName;
  const newMailboxName = req.body.newMailboxName;
  if (oldMailboxName && newMailboxName) {
    imap.once('ready', () => {
      imap.renameBox(oldMailboxName, newMailboxName, (err, box) => {
        if (err) {
          res.statusCode = 500;
          res.json({msg: err.message});
          imap.end();
        } else {
          res.end();
          imap.end();
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
      msg: 'both oldMailboxName and newMailboxName should not be empty'
    });
  }
});
/**
 * delete mailbox
 * query: ?path=path/to/mailbox
 */
router.delete('/', (req, res) => {
  const { path } = req.query;
  if (path) {
    imap.once('ready', () => {
      imap.delBox(path, (err, box) => {
        if (err) {
          res.statusCode = 500;
          res.json({msg: err.message});
          imap.end();
        } else {
          res.end();
          imap.end();
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