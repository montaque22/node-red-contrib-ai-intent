const compromise = require("compromise");
const compromiseDates = require("compromise-dates");
const Sugar = require("sugar");

compromise.plugin(compromiseDates);

const getAmount = (message) => {
  const nlp = compromise(message);

  return nlp.numbers().toNumber().out("array");
};

const getDuration = (message) => {
  const nlp = compromise(message);
  const dates = nlp.dates().get();

  return dates.map((date) => {
    return Sugar.Date.millisecondsFromNow(new Date(date.start));
  });
};

const getDate = (message) => {
  const nlp = compromise(message);

  return nlp.dates().get();
};

module.exports = { getAmount, getDate, getDuration };
