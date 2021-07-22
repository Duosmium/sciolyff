import * as yup from "yup";

import { root } from "./helpers";

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
    ),
  points: yup.number().integer().required(),
});
