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
  let dates = nlp.dates().get();

  if (dates.length) {
    return dates.map((date) => {
      const milliSecs = Sugar.Date.millisecondsFromNow(new Date(date.start));

      return milliSecs ? milliSecs + 1 : milliSecs;
    });
  }

  return nlp
    .durations()
    .get()
    .map((date) => {
      const milliSecs = Sugar.Date.millisecondsFromNow(
        Sugar.Date.advance(new Date(), date)
      );
      return milliSecs ? milliSecs + 1 : milliSecs;
    });
};

const getDate = (message) => {
  const nlp = compromise(message);
  let dates = nlp.dates().get();

  if (dates.length) {
    return dates.map((date) => {
      return new Date(date.start);
    });
  }

  return nlp
    .durations()
    .get()
    .map((date) => {
      return Sugar.Date.advance(new Date(), date);
    });
};

module.exports = { getAmount, getDate, getDuration };
