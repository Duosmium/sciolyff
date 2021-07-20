import * as yup from "yup";

import tournamentSchema from "./tournament.js";

const eventSchema = yup.object().shape({});
const teamSchema = yup.object().shape({});
const placementSchema = yup.object().shape({});
const trackSchema = yup.object().shape({});
const penaltySchema = yup.object().shape({});

const schema = yup.object().shape({
  // required
  Tournament: tournamentSchema.required(),
  Events: yup.array().of(eventSchema).required(),
  Teams: yup.array().of(teamSchema).required(),
  Placings: yup.array().of(placementSchema).required(),

  // optional
  Track: yup.array().of(trackSchema).notRequired(),
  Penalties: yup.array().of(penaltySchema).notRequired(),
});

import yaml from "js-yaml";
import fs from "fs";

let rep;
try {
  rep = yaml.load(
    fs.readFileSync("examples/2018-12-08_liso_invitational_b.yaml", "utf8")
  );
} catch (e) {
  console.log(e);
}

schema
  .validate(rep)
  .then(() => {
    console.log("valid!");
  })
  .catch((err) => {
    console.error(err);
  });
