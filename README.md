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
  status: string;
  errors?: Error[];
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
- `status`: human readable status messages
- `errors?`: validation errors (if any)

To parse the returned `errors` list, we provide a `sciolyff.format` function.

```ts
function format(errors?: Error[], filename?: string, colors?: boolean): string;
```

**Arguments:**

- `errors`: the `errors` property returned by `sciolyff.valid`
- `filename`: the original filename (used for line numbers/linking)
- `colors`: whether to color the output (recommended if you're outputting to a terminal)

**Returns:**

The formatted error messages (string).

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

The `Interpreter` class can be used to parse SciolyFF. Validation is not performed, so make sure you're passing in valid SciolyFF (which you can validate with `valid()`).

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

## Development

Install dependencies with `npm install`. Build the project with `npm run build`. The `dist` directory contains the built files.

To publish the package to NPM, use `npm run release`. This will run tests, build the package, and publish it to NPM.

### Testing

Tests run automatically before releasing (with `npm run release`), as well as with GitHub Actions on push. You can manually run tests using `npm test`.

We use [AVA](https://github.com/avajs/ava) as a test runner, and most of our tests are [snapshot tests](https://github.com/avajs/ava/blob/main/docs/04-snapshot-testing.md). However, since our snapshots are quite large and AVA displays the full file, it may be difficult to find differences when they occur. If you find a difference, you can use `npx ava --update-snapshot` to update the snapshot, then inspect the output with `git diff tests/interpreter/snapshots/test.ts.md` (or the appropriate path for validator snapshots). After inspecting the snapshot diff and verifying that everything is expected, commit the snapshot files.

### Legacy Tests

**Note:** We have updated our tests, so this information is here for reference only.

To ensure that the output of this package matches the output of the previous Ruby-based package, we have a couple of testing scripts to run.

First, ensure that Ruby is installed (versions between 2.7 and 2.5). You may want to use [asdf](https://asdf-vm.com/) to manage your Ruby versions.

Next, install the `sciolyff-duosmium` gem by cloning the `sciolyff-ruby` repo.

```
git clone https://github.com/Duosmium/sciolyff-ruby.git
cd sciolyff-ruby
gem build sciolyff.gemspec
gem install sciolyff-duosmium-0.13.1.gem
```

You will also need to install psych 3.3.2.

```
gem install psych -v 3.3.2
```

Get the latest data files by cloning the `duosmium` repository in the same parent folder as this current repository (`sciolyff`). The `duosmium-` directory should be accessible from this current directory by moving one layer up (`../duosmium`).

```
git clone https://github.com/Duosmium/duosmium.git
```

You are now ready to generate the test files. Create new directories to place the generated json files.

```
mkdir compare/js
mkdir compare/ruby
```

To generate files:

```
node compare/generateJs.js
```

```
ruby compare/generateRuby.rb
```

When running the Ruby script, you may see the following error:

```
sciolyff-duosmium-0.13.1/lib/sciolyff/interpreter.rb:20:in `initialize': uninitialized constant SciolyFF::Interpreter::Psych (NameError)
```

If this occurs, you'll need to manually patch the interpreter.rb file. Navigate to the full path displayed in the error message and add the following lines to the file:

```diff
  # ...
  require 'sciolyff/interpreter/track'

+ require 'psych'
+ require 'date'

  attr_reader :tournament, :events, :teams, :placings, :penalties, :tracks

  def initialize(rep)
      if rep.instance_of? String
  # ...
```

After the test files have been generated, run the following script to compare results:

```
node compare/compare.js
```

Any files containing differences will be printed to the console. If such files exist, you'll need to manually inspect them. Use a service like [Diffchecker](https://www.diffchecker.com/) to compare the two files and find where exactly they differ.
