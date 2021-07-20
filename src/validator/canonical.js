import https from "https";
import csv from "neat-csv";

// create async get function
function get(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";
        res.on("data", (chunk) => {
          data += chunk;
        });
        res.on("end", () => {
          resolve(data);
        });
      })
      .on("error", reject);
  });
}

const base = "https://duosmium.org/results/";
function fetchData(file) {
  const inner = async (file) => {
    const url = new URL(file, base);
    const data = await get(url);
    const parsed = (await csv(data, { headers: false })).map((row) =>
      Object.values(row)
    );
    return parsed;
  };

  // cache fetched data
  const cache = new Map();
  if (cache.has(file)) {
    return cache.get(file);
  }
  const result = inner(file);
  cache.set(file, result);
  return result;
}

export default async function (name, file) {
  const data = await fetchData(file);
  const res = data.some((row) => row.every((el, i) => name[i] === el));
  return res;
}
