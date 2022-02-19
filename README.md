# sciolyff-js

`sciolyff-js` is a JS port of [SciolyFF](https://github.com/Duosmium/sciolyff), a standardized file format to represent Science Olympiad tournament results. SciolyFF is a subset of YAML.

SciolyFF powers [Duosmium Results](https://www.duosmium.com/results/), a tournament results archive/viewer.

## Installation

```
npm install sciolyff
```

## Usage

The default entrypoint exports a `Interpreter` class and a `valid()` function.

### Validation

```ts
async function valid(
  repOrYaml: string | Record<string, unknown>,
  options: { abortEarly?: boolean; canonical?: boolean } = {}
): Promise<{
  valid: boolean;
  success: boolean;
  validWithWarnings: boolean;
  readable: string;
}>;
```

**Arguments:**

- `repOrYaml`: a string or object representing a sciolyff representation
- `options`:
  - `abortEarly` (default: `false`): abort validation on first error
  - `canonical` (default: `true`): throw warnings on non-canonical school/event names

**Returns:**

- `valid`: is sciolyff valid?
- `success`: was validation successful?
- `validWithWarnings`: are there warnings (if valid)?
- `readable`: human readable error messages

The `sciolyff-js` package also has a command line utility that can validate if a given file meets the spec.

```
$ npx sciolyff-js -h
Usage: npx sciolyff-js [options] <file>

Arguments:
  file               file to check

Options:
  -n, --no-canon     Disable canonical name checks.
  -a, --abort-early  Abort on first error.
  -h, --help         display help for command
```

## Parsing

The `Interpreter` class can be used to parse SciolyFF.

```js
import fs from "fs";
import sciolyff from "sciolyff";

const file = fs.readFileSync("2022-01-08_national_invitational_c.yaml", "utf8");
const interpreter = new sciolyff.Interpreter(file);

let anat = interpreter.events.find((e) => e.name === "Anatomy and Physiology");
console.log(anat.trialed); // false

let team_one = interpreter.teams.find((t) => t.number == 1);
console.log(team_one.placingFor(anat).points); // 62
console.log(team_one.points); // 1090
console.log(team_one.school); // Adlai E. Stevenson High School
console.log(team_one.suffix); // Gold

// sorted by rank
console.log(interpreter.teams.slice(0, 3));
// [ { school: 'Mountain View High School', suffix: 'Black', number: 87, state: 'CA' ... }, ... ]
```
