import test from "ava";

import fsSync from "fs";
import fs from "fs/promises";
import { basename } from "path";

import sciolyff from "../../src/index.js";

const commonCases = "tests/common/";
const casesDir = "tests/validator/cases/";

const commonTestCases = fsSync
  .readdirSync(commonCases, "utf-8")
  .map((f) => commonCases + f);
const localTestCases = fsSync
  .readdirSync(casesDir, "utf-8")
  .map((f) => casesDir + f);
const testCases = localTestCases.concat(commonTestCases);

for (const testCase of testCases) {
  const name = basename(testCase, ".yaml");
  test("validator: " + name, async (t) => {
    const data = await fs.readFile(testCase, "utf8");

    const validated = await sciolyff.valid(data, { canonical: false });
    t.snapshot(validated);
  });
}

test("validator: test canonical schools and events", async (t) => {
  const data = await fs.readFile(casesDir + "basic.yaml", "utf8");

  const validated = await sciolyff.valid(data, { canonical: true });
  t.snapshot(validated);
});

test("validator: test formatter", async (t) => {
  const data = await fs.readFile(casesDir + "basic.yaml", "utf8");

  const validatedSuccess = await sciolyff.valid(data, { canonical: false });
  const formattedSuccess = sciolyff.format(
    validatedSuccess.errors,
    "basic.yaml",
    false
  );
  t.assert(formattedSuccess.includes("SciolyFF passed the validation"));

  const validatedWarn = await sciolyff.valid(data, { canonical: true });
  const formattedWarn = sciolyff.format(
    validatedWarn.errors,
    "basic.yaml",
    false
  );
  t.assert(formattedWarn.includes("Valid SciOlyFF"));
  t.assert(formattedWarn.includes("with warnings"));
});
