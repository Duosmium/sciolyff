import * as yup from "yup";
import { getIn } from "yup/lib/util/reach";

import yaml from "js-yaml";

import tournamentSchema from "./tournament";
import eventSchema from "./events";
import teamSchema from "./teams";
import placingSchema from "./placings";

import trackSchema from "./tracks";
import penaltySchema from "./penalties";

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

export default async function valid(
  repOrYaml: string | any,
  options: { abortEarly?: boolean; canonical?: boolean } = {}
) {
  const abortEarly = options.abortEarly || false;
  const canonical = options.canonical || true;

  let rep = repOrYaml;
  if (typeof repOrYaml === "string") {
    try {
      rep = yaml.load(repOrYaml);
    } catch (e) {
      return {
        valid: false,
        success: false,
        readable: "Failed to parse YAML.",
      };
    }
  }

  try {
    await schema.validate(rep, {
      abortEarly,
      stripUnknown: true,
      context: {
        canonical,
      },
    });
    return {
      valid: true,
      success: true,
      readable: "The SciOlyFF file passed the validation!",
    };
  } catch (e) {
    if (e.name === "ValidationError") {
      const typedErr: yup.ValidationError = e;
      const warningsOnly = typedErr.errors.every((msg) =>
        msg.startsWith("$$warn$$")
      );
      const processedErrors = (
        typedErr.inner.length > 0 ? typedErr.inner : [typedErr]
      ).map(
        (err) =>
          (err.errors[0].startsWith("$$warn$$")
            ? "WARNING (still valid SciolyFF): " +
              err.errors[0].replace("$$warn$$", "").trimStart()
            : "ERROR (invalid SciolyFF): " + err.errors[0]) +
          " at:\n" +
          JSON.stringify(
            getIn(schema, err.path || "", rep).parent,
            undefined,
            4
          )
      );
      if (warningsOnly) {
        return {
          valid: true,
          success: true,
          readable:
            "Valid SciOlyFF!\n\nWarnings:\n" + processedErrors.join("\n\n"),
        };
      }
      return {
        valid: false,
        success: true,
        readable:
          "Invalid SciOlyFF!\n\nSee Errors:\n" + processedErrors.join("\n\n"),
      };
    } else {
      return {
        valid: false,
        success: false,
        readable: "An unexpected error occurred",
      };
    }
  }
  // return {
  //   valid: boolean // is sciolyff valid?
  //   success: boolean // was validation successful?
  //   readable: string // human readable error message
  // };
}

// const tests = [
//   "examples/2018-12-08_liso_invitational_b.yaml",
//   // "examples/2020-02-01_solon_invitational_c.yaml",
//   // "examples/2019-03-16_WI_states_b.yaml",
//   // "examples/2017-05-20_nationals_c.yaml",
// ];
// tests.forEach((filename) => {
//   valid(fs.readFileSync(filename, "utf8"), { canonical: true }).then((res) =>
//     console.log(res.readable)
//   );
// });
