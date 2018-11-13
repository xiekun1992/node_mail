let resolvePath = function () {
  let args = Array.prototype.slice.call(arguments);
  return args.filter(arg => arg).join('/');
}
let recurseBox = function (box) {
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

module.exports = {
  resolvePath,
  recurseBox
}