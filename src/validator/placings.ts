import * as yup from "yup";

import rawsSchema from "./raws.js";
import { root } from "./helpers.js";

export default yup.object().shape({
  // always required
  event: yup
    .string()
    .test(
      "matching-event",
      "'event: ${value}' in Placings does not match any event in Events",
      (value, context) =>
        root(context)["Events"].some((event) => event.name === value)
    )
    .test(
      "unique-event-and-team",
      "duplicate placing",
      (value, context) =>
        root(context)["Placings"].filter(
          (place) => place.event === value && place.team === context.parent.team
        ).length === 1
    )
    .required(),
  team: yup
    .number()
    .integer()
    .test(
      "matching-team",
      "'team: ${value}' in Placings does not match any team number in Teams",
      (value, context) =>
        root(context)["Teams"].some((team) => team.number === value)
    )
    .required(),

  // optional
  place: yup
    .number()
    .integer()
    .when("explicit", (explicit, schema) =>
      explicit
        ? schema.required("a place is required when using explicit scores")
        : schema.notRequired()
    )
    .when(
      ["participated", "disqualified", "unknown", "explicit"],
      // @ts-ignore: looks like https://github.com/jquense/yup/issues/1417
      (participated, disqualified, unknown, explicit, schema) =>
        !explicit && (participated === false || disqualified || unknown)
          ? schema.oneOf([undefined], "having a place does not make sense")
          : schema
    ),
  trackPlace: yup
    .number()
    .integer()
    .notRequired()
    .when("explicit", (explicit, schema) =>
      !explicit
        ? schema.oneOf([undefined], "explicit must be set to allow trackPlace")
        : schema
    ),
  explicit: yup.boolean().notRequired(),

  participated: yup.boolean().notRequired(),
  disqualified: yup
    .boolean()
    .notRequired()
    .when("participated", (participated, schema) =>
      participated === false
        ? schema.oneOf(
            [false, undefined],
            "impossible participation-disqualified combination"
          )
        : schema
    )
    .when("unknown", (unknown, schema) =>
      unknown
        ? schema.oneOf(
            [false, undefined],
            "impossible unknown-disqualified combination"
          )
        : schema
    ),
  exempt: yup.boolean().notRequired(),
  tie: yup
    .boolean()
    .notRequired()
    .when("raw", (raw, schema) =>
      raw
        ? schema.oneOf(
            [false, undefined],
            "having a tie value does not make sense"
          )
        : schema
    ),
  unknown: yup
    .boolean()
    .notRequired()
    .test(
      "invalid-unknown",
      "unknown place not allowed (either placing must be exempt or event must be trial/trialed)",
      (value, context) =>
        // this is kind of mess, sorry!
        !value ||
        root(context)["Tournament"]["maximum place"] !== undefined ||
        context.parent.exempt ||
        // below checks if the current event is trial or trialed
        root(context)["Events"].some(
          (event) =>
            event.name === context.parent.event &&
            (event.trial || event.trialed)
        ) ||
        // below checks if the team is an exhibition team
        root(context)["Teams"].some(
          (team) => team.number === context.parent.team && team.exhibition
        )
    ),
  raw: rawsSchema
    .notRequired()
    .default(undefined)
    .when(
      ["participated", "disqualified", "unknown"],
      // @ts-ignore: looks like https://github.com/jquense/yup/issues/1417
      (participated, disqualified, unknown, explicit, schema) =>
        explicit || participated === false || disqualified || unknown
          ? schema.oneOf([undefined], "having raw section does not make sense")
          : schema
    )
    .test(
      "no-mix-of-raws-and-places",
      "cannot mix 'raw:' and 'place:' in same file",
      (value: any, context: yup.TestContext) =>
        !value ||
        root(context)["Placings"].every(
          (placing) => placing.place === undefined
        )
    ) as typeof rawsSchema,
});
