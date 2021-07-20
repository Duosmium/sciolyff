import * as yup from "yup";

// get grandparent from context
const root = (context) => context.from[1].value;

// helper functions
const teamCount = (context) =>
  root(context)["Teams"].filter((team) => !team.exhibition).length;

const schoolsCount = (context) =>
  root(context)
    ["Teams"].map((team) => [team.school, team.city, team.state])
    // dedupe by only keeping the first occurance
    .filter((school, index, self) => self.indexOf(school) === index).length;

export default yup.object().shape({
  // always required keys
  location: yup.string().required(),
  level: yup
    .string()
    .trim()
    .oneOf(["Invitational", "Regionals", "States", "Nationals"])
    .required(),
  division: yup.string().trim().oneOf(["A", "B", "C"]).required(),
  year: yup.number().integer().required(),

  // possibly optional keys
  name: yup
    .string()
    .trim()
    .when("level", (level, schema) =>
      // name is optional for states and nationals
      ["States", "Nationals"].includes(level)
        ? schema.notRequired()
        : schema.required(
            "name for Tournament required " +
              `('level: ${level}' is not States or Nationals)`
          )
    ),
  state: yup
    .string()
    .trim()
    .when("level", (level, schema) =>
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
              context.parent["maximum place"] || Infinity
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
    .when("level", (level, schema) =>
      // bids invalid for invitationals/nationals
      // but recommended for states and regionals
      ["States", "Regionals"].includes(level)
        ? schema.required(
            `TODO: this is a warning: field 'bids:' recommended for level: ${level}`
          )
        : schema.oneOf(
            [undefined, null],
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
            [undefined, null],
            "field 'bids per school:' not relevant without field 'bids:'"
          )
    ),
  "short name": yup
    .string()
    .trim()
    .when("name", (name, schema) =>
      name !== undefined && name !== null
        ? schema.notRequired()
        : schema.oneOf(
            [undefined, null],
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
  "worst placings dropped": yup.number().integer().notRequired(),
  "exempt placings": yup.number().integer().notRequired(),
  "maximum place": yup
    .number()
    .integer()
    .min(1)
    .test(
      "max-place-in-range",
      "maximum place: larger than team count",
      (value, context) => (value ? value <= teamCount(context) : true)
    )
    .notRequired(),
  "per-event n": yup
    .string()
    .trim()
    .oneOf(["place", "participation"])
    .notRequired(),
  "n offset": yup.number().integer().min(-teamCount).notRequired(),
  date: yup
    .date()
    .when(["start date", "end date"], (start, end, schema) =>
      start && end
        ? schema.oneOf(
            [undefined, null],
            "date: does not make sense if start and end dates are provided"
          )
        : schema.required(
            "You need either a date for the tournament (if it took place in one day) " +
              "or beginning and end dates (if it took place over the course of multiple days)."
          )
    ),
  "start date": yup
    .date()
    .test(
      "valid-date",
      "start date cannot be set if date is set",
      (value, context) => !context.parent.date || !value
    )
    .notRequired(),
  "end date": yup
    .date()
    .test(
      "valid-date",
      "end date cannot be set if date is set",
      (value, context) => !context.parent.date || !value
    )
    .notRequired(),
  "awards date": yup.date().notRequired(),
});
