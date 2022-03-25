import * as yup from "yup";

import canonical from "./canonical.js";
import { root } from "./helpers.js";

// helper functions
const placingsByPlace = (
  context: yup.TestContext,
  eventName: string
): Record<string, any> =>
  root(context)["Placings"].reduce((acc: Record<string, any>, placing) => {
    // match undefined/null with non-strict equality
    if (placing.place != null && placing.event === eventName) {
      acc[placing.place.toString()]
        ? acc[placing.place.toString()].push(placing)
        : (acc[placing.place.toString()] = [placing]);
    }
    return acc;
  }, {});
const placesWithExpandedTies = (context: yup.TestContext, eventName: string) =>
  // e.g. [6, 6, 8] -> [6, 7, 8]
  Object.entries(placingsByPlace(context, eventName))
    .map(([place, placings]) =>
      Array(placings.length)
        .fill(0)
        .map((_, i) => parseInt(place) + i)
    )
    .flat();

export default yup.object().shape({
  // always required
  name: yup
    .string()
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
        Object.entries(placingsByPlace(context, value as string)).every(
          ([place, placings]: [string, any[]]) =>
            // ignore places with 1 or 0 if using reverse scoring
            root(context)["Tournament"]["reverse scoring"] &&
            (place === "1" || place === "0")
              ? true
              : placings.filter((p) => !p.tie).length <= 1
        )
    )
    .test(
      "ties-paired",
      "event: ${value} has unpaired ties",
      (value, context) =>
        Object.values(placingsByPlace(context, value as string)).every(
          (placings: any[]) => placings.filter((p) => p.tie).length !== 1
        )
    )
    .test(
      "no-gaps-in-places",
      "event: ${value} has gaps in place",
      (value, context) => {
        const places = placesWithExpandedTies(context, value as string);
        if (places.length === 0) return true;

        const sequential = Array(Math.max(...places) - Math.min(...places) + 1)
          .fill(0)
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
        root(context)["Tournament"]["reverse scoring"]
          ? true
          : root(context)["Placings"].some((placing) => placing.raw) ||
            Math.min(
              ...root(context)
                ["Placings"].filter((placing) => placing.event === value)
                .map((placing) => placing.place as number)
                .filter((p) => p !== undefined)
            ) === 1
    )
    .test(
      "reverse-places-start-at-same-place",
      "places for event: ${value} don't start at the same place",
      (value, context) => {
        // only test when using reverse scoring
        if (!root(context)["Tournament"]["reverse scoring"]) return true;
        const maxes = root(context)["Placings"].reduce(
          (acc: { total: number; event: number }, placing) => {
            if (placing.event === value) {
              acc.event = Math.max(acc.event, (placing.place as number) || 0);
            }
            acc.total = Math.max(acc.total, (placing.place as number) || 0);
            return acc;
          },
          { total: 0, event: 0 }
        );
        // check if the event high score is the global high score
        return maxes.event === maxes.total;
      }
    )
    .test(
      "canonical-event",
      "$$warn$$ non-canonical event: ${value}",
      async (value, context) =>
        context.options?.context?.canonical
          ? await canonical([value], "events.csv")
          : true
    )
    .required(),

  // optional
  trial: yup.boolean().notRequired().default(false),
  trialed: yup.boolean().notRequired().default(false),
  scoring: yup.string().oneOf(["high", "low"]).notRequired(),
});
