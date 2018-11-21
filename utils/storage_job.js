const fs = require('fs');
const EventEmitter = require('events');
const path = require('path');

class StorageJob extends EventEmitter {
  constructor () {
    super();
    this.queue = [];
    // this.tasks = {};

    this.on('add', function ({filename, contentType, buffer, checksum}) {
      this.queue.push({filename, contentType, buffer, checksum});
      this.store();
    });
  }
  store () {
    let {filename, contentType, buffer, checksum} = this.queue.shift();
    fs.writeFile(path.resolve(__dirname, '../attachments/', `${checksum}_${filename}`), Buffer.from(buffer, 'base64'), err => {
      if (err) {
        console.log(`>>>>> File Storage Error: ${filename}, ${err.message}`);
        return ;
      }
      console.log(`>>>>> File Storaged: ${filename}`);
    });
  }
  add ({filename, contentType, buffer, checksum}) {
    this.emit('add', {filename, contentType, buffer, checksum});
    return `${checksum}_${filename}`;
  }
}

let job;
function getInstance() {
  if (!job) {
    job = new StorageJob();
  }
  return job;
}

module.exports = {
  getInstance
}