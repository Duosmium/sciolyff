import * as yup from "yup";

import { root } from "./helpers.js";

export const histoData = yup.object().shape({
  event: yup
    .string()
    .test(
      "matching-event",
      "'event: ${value}' in Histograms does not match any event in Events",
      (value, context) =>
        root(context)["Events"].some((event) => event.name === value)
    )
    .test(
      "unique-event",
      "duplicate placing",
      (value, context) =>
        root(context)["Histograms"].filter((histo) => histo.event === value)
          .length === 1
    )
    .required(),

  start: yup.number().required(),
  width: yup.number().min(0).required(),
  counts: yup.array().of(yup.number().min(0).required()).required(),
});

export default yup.object().shape({
  // always required
  type: yup.string().oneOf(["data"]).required(),

  data: yup.array().of(histoData).required(),
});
