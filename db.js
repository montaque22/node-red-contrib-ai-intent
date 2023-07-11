const storage = require("node-persist");

let didInit = false;
//you must first call storage.init
async function getDatabase(cb) {
  if (!didInit) {
    await storage.init();
  }
  cb(storage);
}

module.exports = { getDatabase };
