import * as yup from "yup";

import yaml from "js-yaml";
import fs from "fs";

import tournamentSchema from "./tournament.js";
import eventSchema from "./events.js";
import teamSchema from "./teams.js";
import placingSchema from "./placings.js";

import trackSchema from "./tracks.js";
import penaltySchema from "./penalties.js";

const schema = yup.object().shape({
  // required
  Tournament: tournamentSchema.required(),
  Events: yup.array().of(eventSchema).required(),
  Teams: yup.array().of(teamSchema).required(),
  Placings: yup.array().of(placingSchema).required(),

  // optional
  Tracks: yup.array().of(trackSchema).notRequired(),
  Penalties: yup.array().of(penaltySchema).notRequired(),
});

export default async function valid(repOrYaml, abortEarly = false) {
  let rep = repOrYaml;
  if (typeof repOrYaml === "string") {
    try {
      rep = yaml.load(repOrYaml);
    } catch (e) {
      return {
        valid: false,
        success: false,
        readable: "Failed to parse YAML.",
        errors: [e],
      };
    }
  }

  try {
    await schema.validate(rep, {
      abortEarly,
      stripUnknown: true,
    });
    return {
      valid: true,
      success: true,
      readable: "The SciOlyFF file passed the validation!",
      errors: [],
    };
  } catch (e) {
    if (e.name === "ValidationError") {
      return {
        valid: false,
        success: true,
        readable: "",
        errors: e.inner,
      };
    } else {
      return {
        valid: false,
        success: false,
        readable: "An unexpected error occurred",
        errors: [e],
      };
    }
  }
  // return {
  //   valid: boolean // is sciolyff valid?
  //   success: boolean // was validation successful?
  //   readable: string // human readable error messages
  //   errors: [] // array of error objects
  // };
}

const tests = [
  "examples/2018-12-08_liso_invitational_b.yaml",
  "examples/2020-02-01_solon_invitational_c.yaml",
  "examples/2019-03-16_WI_states_b.yaml",
  "examples/2017-05-20_nationals_c.yaml",
];
tests.forEach((filename) => {
  valid(fs.readFileSync(filename, "utf8")).then((res) => console.log(res));
});
