let resolvePath = () => {
  let args = Array.prototype.slice.call(arguments);
  return args.filter(arg => arg).join('/');
}
let recurseBox = (box) => {
  let arr = [];
  for (let e in box) {
    if (box.hasOwnProperty(e)) {
      let obj = {};
      obj.name = e;
      obj.delimiter = box[e].delimiter;
      if (box[e].children) {
        obj.children = recurseBox(box[e].children);
      }
      arr.push(obj);
    }
  }
  return arr;
}
let hasAttachments = (obj) => {
  if (Object.prototype.toString.call(obj) === '[object Object]') {
    if (obj.disposition && obj.disposition.type == 'attachment') {
      return true;
    }
  } else if (Object.prototype.toString.call(obj) === '[object Array]') {
    for (let o of obj) {
      if (hasAttachments(o)) {
        return true;
      }
    }
  }
  return false;
}
let combineMailbox = (list) => {
  if (list) {
    return list.map(f => ({
      name: f.name && f.name || `${f.mailbox}@${f.host}`,
      host: `${f.mailbox}@${f.host}`
    }));
  }
  return list;
}

module.exports = {
  resolvePath,
  recurseBox,
  hasAttachments,
  combineMailbox
}