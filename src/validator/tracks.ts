import * as yup from "yup";

import { root } from "./helpers.js";

// helper functions
const teamCount = (context: yup.TestContext, trackName: string) =>
  root(context)["Teams"].filter(
    (team) => team.track === trackName && !team.exhibition
  ).length;

export default yup.object().shape({
  // always required
  name: yup
    .string()
    .test(
      "unique-track-name",
      "duplicate track name: ${value}",
      (value, context) =>
        root(context)["Tracks"].filter((track) => track.name === value)
          .length === 1
    )
    .test(
      "matching-teams",
      "track with 'name: ${value}' has no teams",
      (value, context) =>
        root(context)["Teams"].filter((team) => team.track === value).length > 0
    )
    .test(
      "no-tracks-when-reverse",
      "cannot use reverse scoring with tracks",
      (value: any, context: yup.TestContext) =>
        !(value && root(context)["Tournament"]["reverse scoring"])
    )
    .required(),

  // optional
  medals: yup
    .number()
    .integer()
    .min(1)
    .test(
      "medals-in-range",
      "medals: larger than maximum place",
      (value, context) =>
        value
          ? value <=
            Math.min(
              teamCount(context, context.parent.name as string),
              (context.parent["maximum place"] as number) || Infinity
            )
          : true
    )
    .notRequired(),
  trophies: yup
    .number()
    .integer()
    .test(
      "trophies-in-range",
      "trophies: larger than team count",
      (value, context) =>
        value
          ? value <= teamCount(context, context.parent.name as string)
          : true
    )
    .min(1)
    .notRequired(),
  "maximum place": yup
    .number()
    .integer()
    .min(1)
    .test(
      "maximum-place-in-range",
      "maximum place: larger than team count",
      (value, context) =>
        value
          ? value <= teamCount(context, context.parent.name as string)
          : true
    )
    .notRequired(),
  "n offset": yup
    .number()
    .integer()
    .test(
      "n-offset-minimum",
      "n offset is too small",
      (value, context) =>
        !value || value > -teamCount(context, context.parent.name as string)
    )
    .notRequired()
    .when("reverse scoring", (reverse, schema) =>
      reverse
        ? schema.oneOf([undefined], "no n offset with reverse scoring")
        : schema
    ),
});
