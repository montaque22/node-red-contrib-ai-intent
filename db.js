const Loki = require("lokijs");
var adapter = new Loki.LokiFsAdapter();
var db = new Loki("registeredIntents.db", {
  adapter: adapter,
  autoload: true,
  autoloadCallback: databaseInitialize,
  autosave: true,
  autosaveInterval: 4000,
});

function databaseInitialize() {
  getIntentsCollection();
}

function getIntentsCollection() {
  const intentCollection = db.getCollection("intents");

  if (intentCollection === null) {
    db.addCollection("intents");
  }
  return db.getCollection("intents");
}

module.exports = { getIntentsCollection, database: db };
