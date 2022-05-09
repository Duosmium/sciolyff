import { parse } from "@vanillaes/csv";
import { dump } from "js-yaml";

export function csvToSciolyFF(file: string, markTies = false): string {
  const csv = parse(file) as string[][];

  const tournament = genTournament(csv);
  const events = csv[1].flatMap((eventName, i) => {
    if (eventName === "") return [];
    return [
      {
        name: eventName,
        trial: csv[2][i] === "Trial" ? true : undefined,
        trialed: csv[2][i] === "Trialed" ? true : undefined,
      },
    ];
  });

  const tracks = csv.slice(3, 53).flatMap((row) => {
    if (row[0] === "") return [];

    return [
      {
        name: row[0] || undefined,
        medals: row[1] || undefined,
        trials: row[2] || undefined,
      },
    ];
  });

  const teams = csv.slice(53, 1053).flatMap((row) => {
    if (row[0] === "") return [];

    return [
      {
        number: parseInt(row[0]),
        school: row[1],
        "school abbreviation": row[2] || undefined,
        suffix: row[3] || undefined,
        city: row[4] || undefined,
        state: row[5] || undefined,
        track: row[6] || undefined,
        exhibition: row[7] === "Yes" ? true : undefined,
        "penalty points": row[8] || undefined, // will be converted to penalty later
      },
    ];
  });

  interface Placing {
    team: number;
    event: string;
    participated?: boolean;
    disqualified?: boolean;
    unknown?: boolean;
    exempt?: boolean;
    place?: number;
    tie?: boolean;
  }
  let placings = teams.flatMap((team, tI) => {
    return events.map((event, eI) => {
      const placing: Placing = {
        team: team.number,
        event: event.name,
      };
      const raw_place = csv.slice(1053, 2053)[tI][eI];
      switch (raw_place.toUpperCase()) {
        case "PO":
          placing.participated = true; // not strictly needed
          break;
        case "NS":
          placing.participated = false;
          break;
        case "DQ":
          placing.disqualified = true;
          break;
        case "LP":
          placing.unknown = true;
          break;
        case "??":
          placing.unknown = true;
          break;
        case "EX":
          placing.exempt = true;
          placing.participated = false;
          break;
        default: {
          const parsed = /EX\[(.+)\]/.exec(raw_place);
          if (parsed) {
            placing.exempt = true;
            const wrapped = parsed[1];
            switch (wrapped) {
              case "PO":
                placing.participated = true;
                break;
              case "DQ":
                placing.disqualified = true;
                break;
              case "LP":
                placing.unknown = true;
                break;
              default:
                placing.place = parseInt(wrapped);
                break;
            }
          } else {
            placing.place = parseInt(raw_place);
          }
        }
      }
      return placing;
    });
  });

  const penalties = teams.flatMap((team) => {
    if (!team["penalty points"]) return [];
    const penalty: { team: number; points: number } = {
      team: team.number,
      points: parseInt(team["penalty points"]),
    };
    team["penalty points"] = undefined;
    return [penalty];
  });

  // Identify and fix placings that are just participation points
  events
    .map((e) => e.name)
    .forEach((eventName) => {
      // skip if there are placings that are second to last
      if (
        placings.find(
          (p) => p.event === eventName && p.place === teams.length - 1
        )
      ) {
        return;
      }

      placings.forEach((p) => {
        // find last place placings
        if (p.event === eventName && p.place === teams.length) {
          p.participated = true;
          p.place = undefined;
        }
      });
    });

  // shift placings down for exhibition teams (fixes fake ties)
  // does not work if there are actual ties in placings
  interface PlacingHasPlace extends Placing {
    place: number;
  }
  if (teams.some((t) => t.exhibition)) {
    const nonPlacePlacings = placings.filter((p) => !p.place);
    placings = [
      // convert placings to an array of an array of placings, by event
      ...placings
        .reduce((acc, p) => {
          if (p.place) {
            const eventPlacings = acc.get(p.event);
            if (eventPlacings) {
              eventPlacings.push(p as PlacingHasPlace);
            } else {
              acc.set(p.event, [p as PlacingHasPlace]);
            }
          }
          return acc;
        }, new Map<string, PlacingHasPlace[]>())
        .values(),
    ]
      .flatMap((arr) =>
        arr
          // sort placings based on place, then exhibition, then exempt
          .sort(
            (a, b) =>
              a.place - b.place ||
              (teams.find((t) => t.number === b.team)?.exhibition ? 1 : 0) -
                (teams.find((t) => t.number === a.team)?.exhibition ? 1 : 0) ||
              (b.exempt ? 1 : 0) - (a.exempt ? 1 : 0)
          )
          // rewrite placings
          .map((p, i) => {
            p.place = i + 1;
            return p as Placing;
          })
      )
      .concat(nonPlacePlacings);
  }

  // automatically mark ties (make sure to check for PO/NS/DQ first!)
  if (markTies) {
    // replace placings
    placings = placings.map((p) => {
      if (
        placings.find(
          (other) =>
            other.place &&
            other.place === p.place &&
            other.event === other.event &&
            other !== p
        )
      ) {
        p.tie = true;
      }
      return p;
    });
  }

  const rep = {
    Tournament: tournament,
    Events: events,
    Tracks: tracks.length > 0 ? tracks : undefined,
    Teams: teams,
    Placings: placings,
    Penalties: penalties.length > 0 ? penalties : undefined,
  };

  return dump(rep).replace(/T00:00:00\.000Z/g, "");
}

function genTournament(csv: string[][]) {
  const tournament: {
    name: string | undefined;
    "short name": string | undefined;
    location: string;
    state: string | undefined;
    level: string;
    division: string;
    year: number;
    "start date"?: Date;
    "end date"?: Date;
    "awards date"?: Date;
    medals: number | undefined;
    trophies: number | undefined;
    bids: number | undefined;
    "n offset": number | undefined;
    "worst placings dropped": number | undefined;
  } = {
    name: csv[0][0] || undefined,
    "short name": csv[0][1] || undefined,
    location: csv[0][2],
    state: csv[0][3] || undefined,
    level: csv[0][4],
    division: csv[0][5],
    year: parseInt(csv[0][6]),

    medals: csv[0][11] ? parseInt(csv[0][11]) : undefined,
    trophies: csv[0][12] ? parseInt(csv[0][12]) : undefined,
    bids: csv[0][13] ? parseInt(csv[0][13]) : undefined,
    "n offset": csv[0][14] ? parseInt(csv[0][14]) : undefined,
    "worst placings dropped": csv[0][15] ? parseInt(csv[0][15]) : undefined,
  };
  // tournament.date = csv[0][7] ? Date.parse(csv[0][7]) : undefined,
  tournament["start date"] =
    csv[0][8] === ""
      ? new Date(Date.parse(csv[0][7]))
      : new Date(Date.parse(csv[0][8]));
  tournament["end date"] =
    csv[0][9] === ""
      ? tournament["start date"]
      : new Date(Date.parse(csv[0][9]));
  tournament["awards date"] =
    csv[0][10] === ""
      ? tournament["end date"]
      : new Date(Date.parse(csv[0][10]));

  return tournament;
}

export default {
  csvToSciolyFF,
};
