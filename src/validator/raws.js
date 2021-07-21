import * as yup from "yup";

export default yup.object().shape({
  // required
  score: yup.number().notOneOf([NaN]).required(),

  // optional
  tier: yup.number().integer().positive().notRequired(),
  "tiebreaker rank": yup.number().integer().positive().notRequired(),
});
