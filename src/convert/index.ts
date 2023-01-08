import { parse } from "@vanillaes/csv";
import { dump } from "js-yaml";

import legacyConvert from "./legacy.js";
import v3convert from "./v3.js";
import v3convertScoring from "./v3-scoring.js";

export function csvToSciolyFF(file: string, markTies = false): string {
  const csv = parse(file) as string[][];

  let rep;
  if (csv[0][0] === "3S") {
    rep = v3convertScoring(csv, markTies);
  } else if (csv[0][0] === "3") {
    rep = v3convert(csv, markTies);
  } else {
    rep = legacyConvert(csv, markTies);
  }

  return dump(rep).replace(/T00:00:00\.000Z/g, "");
}

export default {
  csvToSciolyFF,
};
