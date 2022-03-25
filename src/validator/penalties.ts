import * as yup from "yup";

import { root } from "./helpers.js";

export default yup.object().shape({
  team: yup
    .number()
    .integer()
    .required()
    .test(
      "team-exists",
      "penalty: team ${value} does not exist",
      (value, context) =>
        root(context)["Teams"].some((team) => team.number === value)
    )
    .test(
      "not-reverse-scoring",
      "penalties are not allowed in reverse scoring",
      (value, context) =>
        !(value && root(context)["Tournament"]["reverse scoring"])
    ),
  points: yup.number().integer().required(),
});
