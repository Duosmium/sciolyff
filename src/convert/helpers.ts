export function genTournament(row: string[]) {
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
    name: row[0] || undefined,
    "short name": row[1] || undefined,
    location: row[2],
    state: row[3] || undefined,
    level: row[4],
    division: row[5],
    year: parseInt(row[6]),

    medals: row[11] ? parseInt(row[11]) : undefined,
    trophies: row[12] ? parseInt(row[12]) : undefined,
    bids: row[13] ? parseInt(row[13]) : undefined,
    "n offset": row[14] ? parseInt(row[14]) : undefined,
    "worst placings dropped": row[15] ? parseInt(row[15]) : undefined,
  };
  // tournament.date = row[7] ? Date.parse(row[7]) : undefined,
  tournament["start date"] =
    row[8] === "" ? new Date(Date.parse(row[7])) : new Date(Date.parse(row[8]));
  tournament["end date"] =
    row[9] === "" ? tournament["start date"] : new Date(Date.parse(row[9]));
  tournament["awards date"] =
    row[10] === "" ? tournament["end date"] : new Date(Date.parse(row[10]));

  return tournament;
}

export function genEvents(eventData: string[][]) {
  return eventData[0].flatMap((eventName, i) => {
    if (eventName === "") return [];

    return [
      {
        name: eventName,
        trial: eventData[1][i] === "Trial" ? true : undefined,
        trialed: eventData[1][i] === "Trialed" ? true : undefined,
      },
    ];
  });
}

export function genTracks(trackData: string[][]) {
  return trackData.flatMap((row) => {
    if (row[0] === "") return [];

    return [
      {
        name: row[0] || undefined,
        medals: row[1] || undefined,
        trophies: row[2] || undefined,
      },
    ];
  });
}

export function genTeams(teamData: string[][]) {
  return teamData.flatMap((row) => {
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
}

export function genPenalties(teams: ReturnType<typeof genTeams>) {
  return teams.flatMap((team) => {
    if (!team["penalty points"]) return [];
    const penalty: { team: number; points: number } = {
      team: team.number,
      points: parseInt(team["penalty points"]),
    };
    team["penalty points"] = undefined;
    return [penalty];
  });
}

export function genHistos(
  events: ReturnType<typeof genEvents>,
  histoData: string[][]
) {
  return events.flatMap((event, i) => {
    if (histoData[0][i] === "") return [];

    return [
      {
        event: event.name,
        start: parseFloat(histoData[0][i]),
        width: parseFloat(histoData[1][i]),
        counts: JSON.parse(histoData[2][i]) as number[],
        info: {
          Min: parseFloat(histoData[3][i]),
          Max: parseFloat(histoData[4][i]),
          Avg: parseFloat(histoData[5][i]),
          StDev: parseFloat(histoData[6][i]),
        },
      },
    ];
  });
}

export interface Placing {
  team: number;
  event: string;
  participated?: boolean;
  disqualified?: boolean;
  unknown?: boolean;
  exempt?: boolean;
  place?: number;
  tie?: boolean;
}
export interface PlacingHasPlace extends Placing {
  place: number;
}
export function genPlacings(
  teams: ReturnType<typeof genTeams>,
  events: ReturnType<typeof genEvents>,
  placingData: string[][],
  markTies: boolean
) {
  let placings = teams.flatMap((team, tI) => {
    return events.map((event, eI) => {
      const placing: Placing = {
        team: team.number,
        event: event.name,
      };
      const raw_place = placingData[tI][eI];
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

  return placings;
}
