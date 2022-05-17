import * as yup from "yup";

import { root } from "./helpers.js";

const dataSchema = yup.object().shape({
    event: yup.string(),

    start: yup.number(),
    width: yup.number(),
    count: yup.number()
})

export default yup.object().shape({
  // always required
  type: yup
    .string()
    .oneOf(["data"])
    .required(),

  data: yup.array().of(dataSchema).required()
});
