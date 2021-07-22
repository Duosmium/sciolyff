#!/usr/bin/env node

import { program } from "commander";
import { version } from "../package.json";
import fs from "fs";
import sciolyff from "../src/index.js";

program
  .version(version)
  .showHelpAfterError()
  .argument("<file>", "file to check")
  .option("-n, --no-canon", "Disable canonical name checks.")
  .option("-a, --abort", "Abort on first error.")
  .action((file, options) => {
    fs.readFile(file, "utf-8", (err, data) => {
      if (!err) {
        sciolyff
          .valid(data, { abortEarly: options.abort, canonical: options.canon })
          .then((res) => {
            console.log(res.readable);
          });
      }
    });
  })
  .parse(process.argv);
