import fs from "fs/promises";
import fsSync from "fs";
import sciolyff from "../dist/src/index.js";

const files = fsSync
  .readdirSync("../duosmium-js/data/")
  .filter(
    (file) => !["recents.yaml", "upcoming.yaml", "official.yaml"].includes(file)
  );

Promise.all(
  files.map(async (file) => {
    const data = await fs.readFile("../duosmium-js/data/" + file, "utf-8");
    console.log(file);
    let interpreter;
    try {
      interpreter = new sciolyff.Interpreter(data);
    } catch (e) {
      console.error(file, e);
      return;
    }
    const selectedData = {
      tournament: interpreter.tournament.name || "Tournament",
      events: interpreter.events
        .map((e) => e.name)
        .sort((a, b) => a.localeCompare(b)),
      placings: interpreter.placings
        .map((p) => ({
          event: p.event.name,
          team: p.team.number,
          points: p.isolatedPoints,
          place: p.place,
        }))
        .sort((a, b) => a.team - b.team || a.event.localeCompare(b.event)),
    };
    await fs.writeFile(
      "./test/js/" + file.replace(".yaml", ".json"),
      JSON.stringify(selectedData, (k, v) => (v === undefined ? null : v))
    );
  })
).then(() => console.log("ok"));
