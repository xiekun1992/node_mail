const express = require('express');
const router = express.Router();
const fs = require('fs');
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
      res.json(boxes);
    });
  });
  imap.once('error', err => {
    res.statusCode = 500;
    res.json({
      msg: 'connection error'
    });
  });
  imap.connect();
});
router.get('/:id', (req, res) => {

});
router.post('/', (req, res) => {
  const { mailboxParentName, mailboxName } = req.body;
  let path;
  if (mailboxName) {
    if (mailboxParentName) {
      path = `${mailboxParentName}/${mailboxName}`;
    } else {
      path = mailboxName;
    }
    imap.once('ready', () => {
      imap.addBox(`aaaa/${mailboxName}`, err => {
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
        msg: 'connection error'
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

});
router.delete('/:id', (req, res) => {

});

module.exports = router;