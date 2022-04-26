import fs from "fs/promises";

async function main() {
  const files = await fs.readdir("./test/js/");
  await Promise.all(
    files.map(async (file) => {
      const js = await fs.readFile("./test/js/" + file, "utf-8");
      const ruby = await fs.readFile("./test/ruby/" + file, "utf-8");

      if (js !== ruby) {
        console.log(file);
      }
    })
  );
}
main().then(() => console.log("ok"));
