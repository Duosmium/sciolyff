import * as yup from "yup";
import { getIn } from "yup/lib/util/reach";

import yaml from "js-yaml";

import tournamentSchema from "./tournament";
import eventSchema from "./events";
import teamSchema from "./teams";
import placingSchema from "./placings";

import trackSchema from "./tracks";
import penaltySchema from "./penalties";

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
export const sciolyffSchema = yup.object().shape({
  // required
  Tournament: tournamentSchema.required(),
  Events: yup.array().of(eventSchema).required(),
  Teams: yup.array().of(teamSchema).required(),
  Placings: yup.array().of(placingSchema).required(),

  // optional
  Tracks: yup.array().of(trackSchema).notRequired(),
  Penalties: yup.array().of(penaltySchema).notRequired(),
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment */

export default async function valid(
  // yaml.load() returns string | object, so we allow that in this case
  // eslint-disable-next-line @typescript-eslint/ban-types
  repOrYaml: string | object,
  options: { abortEarly?: boolean; canonical?: boolean } = {}
): Promise<{
  valid: boolean; // is sciolyff valid?
  success: boolean; // was validation successful?
  readable: string; // human readable error message
}> {
  const abortEarly = options.abortEarly || false;
  const canonical = options.canonical || true;

  let rep = repOrYaml;
  if (typeof repOrYaml === "string") {
    try {
      const loaded = yaml.load(repOrYaml) ?? {};
      if (typeof loaded === "number") {
        throw new Error("Invalid YAML");
      }
      rep = loaded;
    } catch (e) {
      return {
        valid: false,
        success: false,
        readable: "Failed to parse YAML.",
      };
    }
  }

  try {
    await sciolyffSchema.validate(rep, {
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
    if (e instanceof yup.ValidationError) {
      const warningsOnly = e.errors.every((msg) => msg.startsWith("$$warn$$"));
      const processedErrors = (e.inner.length > 0 ? e.inner : [e]).map(
        (err) =>
          (err.errors[0].startsWith("$$warn$$")
            ? "WARNING (still valid SciolyFF): " +
              err.errors[0].replace("$$warn$$", "").trimStart()
            : "ERROR (invalid SciolyFF): " + err.errors[0]) +
          " at:\n" +
          JSON.stringify(
            getIn(sciolyffSchema, err.path || "", rep).parent,
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
