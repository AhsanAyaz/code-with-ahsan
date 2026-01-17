const os = require("os");

const info = {
  platform: os.platform(),
  type: os.type(),
  release: os.release(),
  arch: os.arch(),
};

console.log(JSON.stringify(info, null, 2));
