import * as yup from "yup";

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

import yaml from "js-yaml";
import fs from "fs";

const tests = [
  "examples/2018-12-08_liso_invitational_b.yaml",
  "examples/2020-02-01_solon_invitational_c.yaml",
  "examples/2019-03-16_WI_states_b.yaml",
  "examples/2017-05-20_nationals_c.yaml",
];
tests.forEach((filename) => {
  try {
    const rep = yaml.load(fs.readFileSync(filename, "utf8"));
    schema
      .validate(rep)
      .then(() => {
        console.log("valid!");
      })
      .catch((err) => {
        console.error({
          tournament: err.value.Tournament,
          message: err.errors,
          params: err.params,
        });
      });
  } catch (e) {
    console.log(e);
  }
});
