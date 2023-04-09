import * as yup from "yup";

import { root } from "./helpers.js";

// helper functions
const teamCount = (context: yup.TestContext) =>
  root(context)["Teams"].filter((team) => !team.exhibition).length;

const schoolsCount = (context: yup.TestContext) =>
  root(context)["Teams"].reduce((acc, team) => {
    acc.add(`${team.school}|${team.city ?? ""}|${team.state}`);
    return acc;
  }, new Set()).size;

type CompetitionLevel = "Invitational" | "Regionals" | "States" | "Nationals";

export default yup.object().shape({
  // always required keys
  location: yup.string().required(),
  level: yup
    .string()
    .oneOf(["Invitational", "Regionals", "States", "Nationals"])
    .required(),
  division: yup.string().oneOf(["A", "B", "C"]).required(),
  year: yup.number().integer().required(),

  // possibly optional keys
  name: yup.string().when("level", (level: CompetitionLevel, schema) =>
    // name is optional for states and nationals
    ["States", "Nationals"].includes(level)
      ? schema.notRequired()
      : schema.required(
          "name for Tournament required " +
            `('level: ${level}' is not States or Nationals)`
        )
  ),
  state: yup.string().when("level", (level, schema) =>
    // state required for non-nationals
    level === "Nationals"
      ? schema.notRequired()
      : schema.required(
          "state for Tournament required " +
            `('level: ${level}' is not Nationals)`
        )
  ),
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
              teamCount(context),
              (context.parent["maximum place"] as number) || Infinity
            )
          : true
    )
    .notRequired(),
  trophies: yup
    .number()
    .integer()
    .min(1)
    .test(
      "trophies-in-range",
      "trophies: larger than team count",
      (value, context) => (value ? value <= teamCount(context) : true)
    )
    .notRequired(),
  bids: yup
    .number()
    .integer()
    .positive()
    .min(1)
    .test("bids-in-range", "bids: larger than school count", (value, context) =>
      value ? value <= schoolsCount(context) : true
    )
    .when("level", (level: CompetitionLevel, schema) =>
      // bids invalid for invitationals/nationals
      // but recommended for states and regionals
      ["States", "Regionals"].includes(level)
        ? schema.required(
            `$$warn$$ field 'bids:' recommended for level: ${level}`
          )
        : schema.oneOf(
            [undefined],
            `bids: does not make sense for level: ${level}`
          )
    ),
  "bids per school": yup
    .number()
    .integer()
    .positive()
    .when("bids", (bids, schema) =>
      bids !== undefined && bids !== null
        ? schema.notRequired()
        : schema.oneOf(
            [undefined],
            "field 'bids per school:' not relevant without field 'bids:'"
          )
    ),
  "short name": yup
    .string()
    .when("name", (name, schema) =>
      name !== undefined && name !== null
        ? schema.notRequired()
        : schema.oneOf(
            [undefined],
            "field 'short name:' not relevant without field 'name:'"
          )
    )
    .when("name", (name, schema) =>
      name !== undefined && name !== null
        ? schema.max(
            name.length,
            `short name for Tournament is longer than normal 'name: ${name}'`
          )
        : schema
    ),
  "worst placings dropped": yup
    .number()
    .integer()
    .notRequired()
    .when("reverse scoring", (reverse, schema) =>
      reverse
        ? schema.oneOf([undefined], "no drops with reverse scoring")
        : schema
    ),
  "exempt placings": yup.number().integer().notRequired(),
  "reverse scoring": yup.boolean().notRequired(),
  "maximum place": yup
    .number()
    .integer()
    .min(1)
    .test(
      "max-place-in-range",
      "maximum place: larger than team count",
      (value, context) => (value ? value <= teamCount(context) : true)
    )
    .notRequired()
    .when("reverse scoring", (reverse, schema) =>
      reverse
        ? schema.oneOf([undefined], "no max place with reverse scoring")
        : schema
    ),
  "per-event n": yup
    .string()
    .oneOf(["place", "participation"])
    .notRequired()
    .when("reverse scoring", (reverse, schema) =>
      reverse
        ? schema.oneOf([undefined], "no per-event n with reverse scoring")
        : schema
    ),
  "n offset": yup
    .number()
    .integer()
    .test(
      "n-offset-minimum",
      "n offset is too small",
      (value, context) => !value || value > -teamCount(context)
    )
    .notRequired()
    .when("reverse scoring", (reverse, schema) =>
      reverse
        ? schema.oneOf([undefined], "no n offset with reverse scoring")
        : schema
    ),
  date: yup
    .mixed()
    .test(
      "valid-date",
      "date must be a date object or string following ISO8601 (no timestamp)",
      (value) => {
        if (value === undefined || value === null) return true;
        if (typeof value === "string") {
          return /^\d{4}-[0-1]\d-[0-3]\d$/.test(value);
        }
        return value instanceof Date;
      }
    )
    // @ts-ignore: looks like https://github.com/jquense/yup/issues/1417
    .when(["start date", "end date"], (start, end, schema) =>
      start && end
        ? schema.oneOf(
            [undefined],
            "date: does not make sense if start and end dates are provided"
          )
        : schema.required(
            "You need either a date for the tournament (if it took place in one day) " +
              "or beginning and end dates (if it took place over the course of multiple days)."
          )
    ),
  "start date": yup
    .mixed()
    .test(
      "valid-date",
      "date must be a date object or string following ISO8601 (no timestamp)",
      (value) => {
        if (value === undefined || value === null) return true;
        if (typeof value === "string") {
          return /^\d{4}-[0-1]\d-[0-3]\d$/.test(value);
        }
        return value instanceof Date;
      }
    )
    .test(
      "valid-date",
      "start date cannot be set if date is set",
      (value, context) =>
        !context.parent.date || !value || (context.parent["end date"] && value)
    )
    .notRequired(),
  "end date": yup
    .mixed()
    .test(
      "valid-date",
      "date must be a date object or string following ISO8601 (no timestamp)",
      (value) => {
        if (value === undefined || value === null) return true;
        if (typeof value === "string") {
          return /^\d{4}-[0-1]\d-[0-3]\d$/.test(value);
        }
        return value instanceof Date;
      }
    )
    .test(
      "valid-date",
      "end date cannot be set if date is set",
      (value, context) =>
        !context.parent.date ||
        !value ||
        (context.parent["start date"] && value)
    )
    .notRequired(),
  "awards date": yup
    .mixed()
    .test(
      "valid-date",
      "date must be a date object or string following ISO8601 (no timestamp)",
      (value) => {
        if (value === undefined || value === null) return true;
        if (typeof value === "string") {
          return /^\d{4}-[0-1]\d-[0-3]\d$/.test(value);
        }
        return value instanceof Date;
      }
    )
    .notRequired(),
  "test release": yup.string().notRequired().url("test release must be a URL"),
});
