import fetchPoly from "node-fetch";
import fetchRetry from "fetch-retry";

const fetch = fetchRetry(fetchPoly, {
  retries: 3,
  retryDelay: function (attempt) {
    return Math.pow(2, attempt) * 500; // 500, 1000, 2000
  },
});

import csv from "neat-csv";

const base = "https://duosmium.org/results/";
function fetchData(file) {
  const inner = async (file) => {
    const url = new URL(file, base);

    const resp = await fetch(url);
    const data = await resp.text();

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
