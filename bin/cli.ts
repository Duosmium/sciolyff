#!/usr/bin/env node

import { program } from "commander";

import fs from "fs";
import sciolyff from "../src/index.js";

program
  .showHelpAfterError()
  .argument("<file>", "file to check")
  .option("-n, --no-canon", "Disable canonical name checks.")
  .option("-a, --abort-early", "Abort on first error.")
  .action((file: string, options: { abortEarly: boolean; canon: boolean }) => {
    fs.readFile(file, "utf-8", (err, data) => {
      if (!err) {
        sciolyff
          .valid(data, {
            abortEarly: options.abortEarly,
            canonical: options.canon,
          })
          .then((res) => {
            console.log(sciolyff.format(res.errors, file, true));
          })
          .catch((err) => console.error(err));
      }
    });
  })
  .parse(process.argv);
