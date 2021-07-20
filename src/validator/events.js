import * as yup from "yup";

import canonical from "./canonical.js";

// get grandparent from context
const root = (context) => context.from[1].value;

// helper functions
const placingsByPlace = (context, eventName) =>
  root(context)["Placings"].reduce((acc, placing) => {
    if (placing.place && placing.event === eventName) {
      acc[placing.place]
        ? acc[placing.place].push(placing)
        : (acc[placing.place] = [placing]);
    }
    return acc;
  }, {});
const placesWithExpandedTies = (context, eventName) =>
  // e.g. [6, 6, 8] -> [6, 7, 8]
  Object.entries(placingsByPlace(context, eventName))
    .map((place, placings) =>
      Array(placings.length)
        .fill()
        .map((_, i) => parseInt(place) + i)
    )
    .flat();

export default yup.object().shape({
  // always required
  name: yup
    .string()
    .trim()
    .test(
      "unique-event-name",
      "duplicate event name: ${value}",
      (value, context) =>
        root(context)["Events"].filter((event) => event.name === value)
          .length === 1
    )
    .test(
      "placings-for-all-teams",
      "event: ${value} has incorrect number of placings",
      (value, context) =>
        root(context)["Placings"].filter((place) => place.event === value)
          .length === root(context)["Teams"].length
    )
    .test(
      "ties-marked",
      "event: ${value} has unmarked ties",
      (value, context) =>
        Object.values(placingsByPlace(context, value)).filter(
          (placings) => placings.filter((p) => !p.tie).length > 1
        ).length === 0
    )
    .test(
      "ties-paired",
      "event: ${value} has unpaired ties",
      (value, context) =>
        Object.values(placingsByPlace(context, value)).filter(
          (placings) => placings.filter((p) => !p.tie).length > 1
        ).length === 0
    )
    .test(
      "no-gaps-in-places",
      "event: ${value} has gaps in place",
      (value, context) => {
        const places = placesWithExpandedTies(context, value);
        if (places.length === 0) return true;

        const sequential = Array(Math.max(...places) - Math.min(...places) + 1)
          .fill()
          .map((_, i) => i + Math.min(...places));
        const gaps = places.filter((p) => !sequential.includes(p));
        if (gaps.length === 0) return true;

        return false;
      }
    )
    .test(
      "places-start-at-one",
      "places for event: ${value} don't start at one",
      (value, context) =>
        Math.min(
          ...root(context)
            ["Placings"].filter((placing) => placing.event === value)
            .map((placing) => placing.place)
            .filter((p) => p !== undefined)
        ) === 1
    )
    .test(
      "canonical-event",
      "TODO: this is a warning: non-canonical event: ${value}",
      async (value) => await canonical([value], "events.csv")
    )
    .required(),

  // optional
  trial: yup.boolean().notRequired().default(false),
  trialed: yup.boolean().notRequired().default(false),
  scoring: yup.string().trim().oneOf(["high", "low"]).notRequired(),
});
