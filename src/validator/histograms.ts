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
      "'event: ${value}' in Histograms has duplicate entries",
      (value, context) =>
        (root(context)["Histograms"] as any)?.data.filter(
          (histo: any) => histo.event === value
        ).length === 1
    )
    .required(),

  start: yup.number().required(),
  width: yup.number().min(0).required(),
  counts: yup.array().of(yup.number().min(0).required()).required(),

  info: yup.lazy((obj: Record<string, any>) => {
    if (!obj) return yup.object().notRequired();
    return yup
      .object()
      .shape(
        Object.keys(obj).reduce((acc, key) => {
          if (typeof obj[key] === "number") {
            acc[key] = yup.number();
          } else {
            acc[key] = yup.string();
          }
          return acc;
        }, {} as Record<string, yup.AnySchema>)
      )
      .notRequired();
  }),
});

export default yup.object().shape({
  // always required
  type: yup.string().oneOf(["data", "url"]).required(),

  // optional
  data: yup
    .array()
    .of(histoData)
    .when("type", (type, schema) => {
      if (type === "data") {
        return schema.required("Histogram data is required when 'type: data'");
      } else if (type === "url") {
        return schema
          .nullable()
          .oneOf(
            [null, undefined],
            "Histogram data not allowed when 'type: url'"
          );
      }
    }),
  url: yup
    .string()
    .url()
    .when("type", (type, schema) => {
      if (type === "url") {
        return schema.required("Histogram url is required when 'type: url'");
      } else if (type === "data") {
        return schema.notRequired();
      }
    }),
});
