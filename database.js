if (typeof localStorage === "undefined" || localStorage === null) {
  var LocalStorage = require("node-localstorage").LocalStorage;
}

const getStorageAtLocation = (location = "./localstore") => {
  return new LocalStorage(location);
}

module.exports = { getStorageAtLocation };
