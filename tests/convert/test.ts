import test from "ava";

import fsSync from "fs";
import fs from "fs/promises";
import { basename } from "path";

import { csvToSciolyFF } from "../../src/convert/index.js";
import { load } from "js-yaml";

const casesDir = "tests/convert/cases/";

const testCases = fsSync
  .readdirSync(casesDir, "utf-8")
  .map((f) => casesDir + f)
  .filter((f) => f.endsWith(".csv"));

for (const testCase of testCases) {
  const name = basename(testCase, ".csv");
  test("convert: " + name, async (t) => {
    const csvData = await fs.readFile(testCase, "utf8");

    const expected = load(
      await fs.readFile(testCase.replace(".csv", ".yaml"), "utf8")
    );

    const markTies = name.startsWith("ties");

    const actual = load(csvToSciolyFF(csvData, markTies));

    t.deepEqual(actual, expected);
  });
}
