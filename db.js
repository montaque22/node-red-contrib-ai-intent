const storage = require("node-persist");

//you must first call storage.init
async function getDatabase(cb) {
  if (!getDatabase.didRun) {
    getDatabase.didRun = true;
    await storage.init();
    await storage.clear();
  }
  cb(storage);
}

module.exports = { getDatabase };
