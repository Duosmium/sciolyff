import fetchPoly from "node-fetch";
import fetchRetry from "fetch-retry";

const newFetch = fetchRetry(fetchPoly as unknown as typeof fetch, {
  retries: 3,
  retryDelay: function (attempt: number) {
    return Math.pow(2, attempt) * 500; // 500, 1000, 2000
  },
});

import csv from "neat-csv";

const base = "https://duosmium.org/results/";
const fetchData = (() => {
  const inner = async (file: string) => {
    const url = new URL(file, base);

    const resp = await newFetch(url.toString());
    const data = await resp.text();

    const parsed = (await csv(data, { headers: false })).map((row) =>
      Object.values(row)
    );
    return parsed;
  };

  // cache fetched data
  const cache: Map<string, Promise<string[][]>> = new Map();

  return (file: string) => {
    if (cache.has(file)) {
      return cache.get(file) as Promise<string[][]>;
    }
    const result = inner(file);
    cache.set(file, result);
    return result;
  };
})();

export default async function canonical(
  name: (string | undefined)[],
  file: string
): Promise<boolean> {
  const data = await fetchData(file);
  const res = data.some(
    (row) => row.length > 0 && row.every((el, i) => el === (name[i] || ""))
  );
  return res;
}
