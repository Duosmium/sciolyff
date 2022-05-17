import * as yup from "yup";
import { getIn } from "yup/lib/util/reach.js";

import yaml from "js-yaml";
import SourceMap from "js-yaml-source-map";

import chalk from "chalk";

import tournamentSchema from "./tournament.js";
import eventSchema from "./events.js";
import teamSchema from "./teams.js";
import placingSchema from "./placings.js";

import trackSchema from "./tracks.js";
import penaltySchema from "./penalties.js";
import histoSchema from "./histograms.js"

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
  Histograms: histoSchema.notRequired(),

  // for internal use
  superscore: yup.boolean().notRequired(),
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment */

interface Error {
  warning: boolean;
  message: string;
  location?: {
    line: number;
    column: number;
    position: number;
  };
  context: unknown;
}

export default async function valid(
  repOrYaml: string | Record<string, unknown>,
  options: {
    abortEarly?: boolean;
    canonical?: boolean;
  } = {}
): Promise<{
  valid: boolean; // is sciolyff valid?
  success: boolean; // was validation successful?
  validWithWarnings: boolean; // are there warnings (if valid)?
  status: string; // human readable status message
  errors?: Error[]; // validation errors (if any)
}> {
  const abortEarly = options.abortEarly ?? false;
  const canonical = options.canonical ?? true;

  const sourceMap = new SourceMap();
  let rep = repOrYaml;
  if (typeof repOrYaml === "string") {
    try {
      const loaded =
        (yaml.load(repOrYaml, { listener: sourceMap.listen() }) as Record<
          string,
          unknown
        >) ?? {};
      if (typeof loaded === "number") {
        throw new Error("Invalid YAML");
      }
      rep = loaded;
    } catch (e) {
      return {
        valid: false,
        success: false,
        validWithWarnings: false,
        status: "Failed to parse YAML.",
      };
    }
  }

  try {
    await sciolyffSchema.validate(rep, {
      abortEarly,
      strict: true,
      context: {
        canonical,
      },
    });
    return {
      valid: true,
      success: true,
      validWithWarnings: false,
      status: "The SciOlyFF file passed the validation!",
    };
  } catch (e) {
    if (e instanceof yup.ValidationError) {
      const warningsOnly = e.errors.every((msg) => msg.startsWith("$$warn$$"));

      const errors: Error[] = (e.inner.length > 0 ? e.inner : [e]).map(
        (err): Error => ({
          warning: err.errors[0].startsWith("$$warn$$"),
          message: err.errors[0].replace("$$warn$$", "").trimStart(),
          location: sourceMap.lookup(err.path || ""),
          context: getIn(sciolyffSchema, err.path || "", rep).parent as unknown,
        })
      );

      if (warningsOnly) {
        return {
          valid: true,
          success: true,
          validWithWarnings: true,
          status: "Valid SciOlyFF! (with warnings)",
          errors,
        };
      }
      return {
        valid: false,
        success: true,
        validWithWarnings: false,
        status: "Invalid SciOlyFF!",
        errors,
      };
    } else {
      return {
        valid: false,
        success: false,
        validWithWarnings: false,
        status: "An unexpected error occurred",
      };
    }
  }
}

export function format(
  errors?: Error[],
  filename?: string,
  colors?: boolean
): string {
  const errorBold = colors ? chalk.bold.red : (s: string) => s;
  const error = colors ? chalk.red : (s: string) => s;
  const warn = colors ? chalk.yellowBright : (s: string) => s;
  const valid = colors ? chalk.bold.green : (s: string) => s;
  const info = colors ? chalk.cyan : (s: string) => s;
  const gray = colors ? chalk.gray : (s: string) => s;

  let errorString: string;

  if (!errors || errors.length === 0) {
    return valid("The SciolyFF passed the validation!");
  }

  if (errors.every((e) => e.warning)) {
    errorString = valid("Valid SciOlyFF!") + " " + warn("(with warnings)");
  } else {
    errorString = errorBold("Invalid SciOlyFF!");
  }
  errorString += "\n\n";
  errorString += errors
    .map(
      (err) =>
        (err.warning
          ? warn("WARNING (still valid SciolyFF): ") + err.message
          : error("ERROR (invalid SciolyFF): ") + err.message) +
        " at:\n" +
        (err.location
          ? filename
            ? `${info(filename)}:${gray(err.location.line.toString())}:${gray(
                err.location.column.toString()
              )}`
            : `line ${err.location.line}, column ${err.location.column}`
          : JSON.stringify(err.context, null, 2))
    )
    .join("\n\n");

  return errorString;
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
