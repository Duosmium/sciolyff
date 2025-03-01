import * as yup from "yup";

import { fetchData } from "./canonical.js";
import { root } from "./helpers.js";

// helper functions
const teamCount = (context: yup.TestContext) =>
  root(context)["Teams"].filter((team) => !team.exhibition).length;

const schoolsCount = (context: yup.TestContext) =>
  root(context)["Teams"].reduce((acc, team) => {
    acc.add(`${team.school}|${team.city ?? ""}|${team.state}`);
    return acc;
  }, new Set()).size;

const existingTournament = async (name?: string) =>
  !!name &&
  (await fetchData("tournament_names.csv")).find((row) => row[0] === name) !==
    undefined;

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
  name: yup
    .string()
    .when("level", (level: CompetitionLevel, schema) =>
      // name is optional for states and nationals
      ["States", "Nationals"].includes(level)
        ? schema.oneOf(
            [undefined, null, ""],
            `${
              level === "States" ? "$$warn$$ " : ""
            }name not necessary for States/Nationals`
          )
        : schema.required(
            "name for Tournament required " +
              `('level: ${level}' is not States or Nationals)`
          )
    )
    .test(
      "style-guide",
      "$$warn$$ field 'name:' should follow title case",
      (value) => {
        if (!value) {
          return true;
        }
        const words = value.split(" ");
        return words.every(
          (word) =>
            ["at", "of", "and", ""].includes(word) ||
            word[0] === word[0].toUpperCase()
        );
      }
    )
    .test(
      "style-guide",
      "$$warn$$ field 'name:' does not follow style guide",
      async (value, context) => {
        if (!value || (await existingTournament(value))) {
          return true;
        }
        if (
          context.parent.level === "Invitational" &&
          !value.includes("Science Olympiad Invitational")
        ) {
          throw context.createError({
            message:
              "$$warn$$ field: 'name' is recommended to end in 'Science Olympiad Invitational' for 'level: Invitational'",
          });
        } else if (
          context.parent.level === "Regionals" &&
          !value.includes("Regional Tournament")
        ) {
          throw context.createError({
            message:
              "$$warn$$ field: 'name' is recommended to end in 'Regional Tournament' for 'level: Regionals'",
          });
        }
        return true;
      }
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
    )
    .test(
      "different-short-name",
      "field 'short name' should be different from field 'name'",
      (value, context) => (!value ? true : value !== context.parent["name"])
    )
    .test(
      "style-guide",
      "$$warn$$ field 'name:' should follow title case",
      (value) => {
        if (!value) {
          return true;
        }
        const words = value.split(" ");
        return words.every(
          (word) =>
            ["at", "of", "and", ""].includes(word) ||
            word[0] === word[0].toUpperCase()
        );
      }
    )
    .test(
      "canonical-short-name",
      "$$warn$$ tournament found with different short name",
      async (value, context) => {
        const data = await fetchData("tournament_names.csv");
        const foundNames: string[] = [];
        for (const row of data) {
          if (row[0] === context.parent["name"]) {
            if (row[1] === value) return true;
            foundNames.push(row[1]);
          }
        }
        if (foundNames.length === 0) return true;
        throw context.createError({
          message: `$$warn$$ field 'short name:'${
            value ? " (currently '" + value + "')" : ""
          } could be changed to one of these names: ['${foundNames.join(
            "', '"
          )}']`,
        });
      }
    )
    .test(
      "recommended-short-name",
      "$$warn$$ field 'short name:' could be changed to a recommended name",
      async (value, context) => {
        if (
          !context.parent["name"] ||
          (await existingTournament(context.parent.name as string))
        ) {
          return true;
        }

        const subs = [
          ["University of", "U of"],
          ["Science Olympiad"],
          ["Tournament"],
          ["Elementary School"],
          ["Middle School"],
          ["High School"],
          ["Academy"],
          ["University"],
          [" at "],
        ];
        let name: string = context.parent["name"];
        subs.forEach((str) => (name = name.replace(str[0], str[1] || "")));
        name = name
          .split(" ")
          .filter((w) => w.length > 0)
          .map((w) =>
            ["at", "of", "and"].includes(w)
              ? w
              : w.charAt(0).toUpperCase() + w.slice(1)
          )
          .join(" ");

        if (value === name) return true;
        throw context.createError({
          message: `$$warn$$ field 'short name:'${
            value ? " (currently '" + value + "')" : ""
          } could be changed to '${name}'`,
        });
      }
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
      "field 'date:' must be a date object or string following ISO8601 (no timestamp)",
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
            "field 'date:' does not make sense if start and end dates are provided"
          )
        : schema.required(
            "You need either a date for the tournament (if it took place in one day) " +
              "or beginning and end dates (if it took place over the course of multiple days)."
          )
    )
    .test(
      "date-in-season",
      "field 'date:' not within season given in field 'year:'",
      (value, context) => {
        if (!value) return true;
        const date = new Date(value as string | Date);
        const season = context.parent.year as number;
        const seasonStart = new Date(season - 1, 7, 15);
        const seasonEnd = new Date(season, 7, 14);
        return date >= seasonStart && date <= seasonEnd;
      }
    ),
  "start date": yup
    .mixed()
    .test(
      "valid-date",
      "start date must be a date object or string following ISO8601 (no timestamp)",
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
    .test(
      "date-in-season",
      "start date not within season given in field 'year:'",
      (value, context) => {
        if (!value) return true;
        const date = new Date(value as string | Date);
        const season = context.parent.year as number;
        const seasonStart = new Date(season - 1, 7, 15);
        const seasonEnd = new Date(season, 7, 14);
        return date >= seasonStart && date <= seasonEnd;
      }
    )
    .notRequired(),
  "end date": yup
    .mixed()
    .test(
      "valid-date",
      "end date must be a date object or string following ISO8601 (no timestamp)",
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
    .test(
      "date-in-season",
      "end date not within season given in field 'year:'",
      (value, context) => {
        if (!value) return true;
        const date = new Date(value as string | Date);
        const season = context.parent.year as number;
        const seasonStart = new Date(season - 1, 7, 15);
        const seasonEnd = new Date(season, 7, 14);
        return date >= seasonStart && date <= seasonEnd;
      }
    )
    .notRequired(),
  "awards date": yup
    .mixed()
    .test(
      "valid-date",
      "awards date must be a date object or string following ISO8601 (no timestamp)",
      (value) => {
        if (value === undefined || value === null) return true;
        if (typeof value === "string") {
          return /^\d{4}-[0-1]\d-[0-3]\d$/.test(value);
        }
        return value instanceof Date;
      }
    )
    .test(
      "date-in-season",
      "awards date not within season given in field 'year:'",
      (value, context) => {
        if (!value) return true;
        const date = new Date(value as string | Date);
        const season = context.parent.year as number;
        const seasonStart = new Date(season - 1, 7, 15);
        const seasonEnd = new Date(season, 7, 14);
        return date >= seasonStart && date <= seasonEnd;
      }
    )
    .notRequired(),
  "test release": yup.string().notRequired().url("test release must be a URL"),
});
