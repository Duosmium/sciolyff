import test from "ava";

import fsSync from "fs";
import fs from "fs/promises";
import { basename } from "path";
// eslint-disable-next-line ava/no-import-test-files
import { dumpInterpreter } from "../helpers.js";

import sciolyff from "../../src/index.js";

const commonCases = "tests/common/";
const casesDir = "tests/interpreter/cases/";

const commonTestCases = fsSync
  .readdirSync(commonCases, "utf-8")
  .map((f) => commonCases + f);
const localTestCases = fsSync
  .readdirSync(casesDir, "utf-8")
  .map((f) => casesDir + f);
const testCases = localTestCases.concat(commonTestCases);

for (const testCase of testCases) {
  const name = basename(testCase, ".yaml");
  test("interpreter: " + name, async (t) => {
    const data = await fs.readFile(testCase, "utf8");

    const interpreter = new sciolyff.Interpreter(data);
    t.snapshot(dumpInterpreter(interpreter));
  });
}

test("interpreter: basic sanity check", async (t) => {
  const data = await fs.readFile(casesDir + "basic.yaml", "utf8");

  const interpreter = new sciolyff.Interpreter(data);
  t.is(interpreter.teams[0].number, 3);
  t.is(interpreter.teams[0].points, 5);
  t.is(interpreter.teams[1].number, 2);
  t.is(interpreter.teams[1].points, 6);
  t.is(interpreter.teams[2].number, 1);
  t.is(interpreter.teams[2].points, 6);
});

test("interpreter: basic superscore", async (t) => {
  const data = await fs.readFile(casesDir + "basic.yaml", "utf8");

  const baseInterpreter = new sciolyff.Interpreter(data);
  const interpreter = baseInterpreter.superscore(true);
  t.is(interpreter.teams[0].number, 2);
  t.is(interpreter.teams[0].points, 5);
  t.is(interpreter.teams[1].number, 3);
  t.is(interpreter.teams[1].points, 5);

  const interpreterRep = baseInterpreter.superscore(false);
  t.is(interpreterRep.Tournament.name, "Basic Test Tournament Name");
});
