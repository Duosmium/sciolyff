import * as yup from "yup";

import canonical from "./canonical.js";

// get grandparent from context
const root = (context) => context.from[1].value;

export default yup.object().shape({
  // always required
  number: yup
    .number()
    .integer()
    .test(
      "unique-number",
      "duplicate team number: ${value}",
      (value, context) =>
        root(context)["Teams"].filter((team) => team.number === value)
          .length === 1
    )
    .test(
      "correct-number-of-exempt-placings",
      "team ${value} has incorrect number of exempt placings",
      (value, context) =>
        context.parent.exhibition ||
        root(context)["Placings"].filter(
          (placing) => placing.team === value && placing.exempt
        ).length === (root(context)["Tournament"]["exempt placings"] || 0)
    )
    .required(),
  school: yup
    .string()
    .trim()
    .test(
      "canonical-school-name",
      "$$warn$$ non-canonical school ${value}",
      async (value, context) =>
        await canonical(
          [value, context.parent.city, context.parent.state],
          "events.csv"
        )
    )
    .required(),
  state: yup.string().trim().required(),

  // optional
  "school abbreviation": yup.string().trim().notRequired(),
  track: yup
    .string()
    .trim()
    .test(
      "matching-track",
      "'track ${value}' does not match any name in 'section Track'",
      (value, context) =>
        !value || root(context)["Tracks"]?.some((track) => track.name === value)
    )
    .test(
      "in-track-if-possible",
      "$$warn$$ missing track for team",
      (value, context) =>
        value ||
        !root(context)["Tracks"] ||
        root(context)["Tracks"].length === 0
    )
    .notRequired(),
  suffix: yup
    .string()
    .trim()
    .test(
      "unique-suffix",
      "duplicate suffix from same school: ${value}",
      (value, context) =>
        value
          ? root(context)["Teams"].filter(
              (team) =>
                team.school === context.parent.school &&
                team.city === context.parent.city &&
                team.state === context.parent.state &&
                team.suffix === value
            ).length === 1
          : true
    )
    .test(
      "unnecessary-suffix",
      "$$warn$$ possible unnecessary suffix: ${value}",
      (value, context) =>
        value
          ? root(context)["Teams"].filter(
              (team) =>
                team.school === context.parent.school &&
                team.city === context.parent.city &&
                team.state === context.parent.state
            ).length > 1
          : true
    )
    .notRequired(),
  city: yup
    .string()
    .trim()
    .test("unambiguous-city", "city for team is ambiguous", (value, context) =>
      value
        ? true
        : !root(context)["Teams"].some(
            (team) =>
              team.city &&
              team.school === context.parent.school &&
              team.state === context.parent.state
          )
    )
    .notRequired(),
  disqualified: yup.boolean().notRequired(),
  exhibition: yup.boolean().notRequired(),
});
