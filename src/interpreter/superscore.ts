// superscores a sciolyff interpreter
//
// this currently does not support tracks or penalties, so the superscore
// will be for all teams combined without any penalties.
// the exported function returns a `rep` object, which
// can be passed back into the interpreter class for handling.

import {
  Interpreter,
  PlacingRep,
  SciOlyFF,
  Team,
  TeamRep,
  TournamentRep,
} from "./types";

const fsn = (t: { school: string; city?: string; state: string }) =>
  `${t.school}|${t.city ?? ""}|${t.state}`;

export default (interpreter: Interpreter): SciOlyFF => {
  if (interpreter.isSuperscore) {
    return interpreter.rep;
  }

  const teams = interpreter.tournament.topTeamsPerSchool?.map((t) => ({
    number: t.number,
    school: t.school,
    state: t.state,
    "school abbreviation": t.schoolAbbreviation,
    // track: t.track,
    // suffix: t.suffix,
    city: t.city,
    disqualified: t.disqualified,
    exhibition: t.exhibition,
  })) as TeamRep[];

  const teamNumbers = teams.reduce((acc, t) => {
    if (!acc.has(fsn(t))) {
      acc.set(fsn(t), t.number);
    }
    return acc;
  }, new Map<string, number>());

  const eventMaxPlacings = interpreter.events.reduce((acc, e) => {
    acc.set(e.name, e.maximumPlace as number);
    return acc;
  }, new Map<string, number>());

  // best place of all teams of a school, by event
  const bestPlacingsBySchool = new Map<number, Map<string, number>>();
  interpreter.placings.forEach((placing) => {
    const compare = interpreter.tournament.reverseScoring ? Math.max : Math.min;
    const event = placing.event?.name as string;
    const school = teamNumbers.get(fsn(placing.team as Team)) as number;
    if (!bestPlacingsBySchool.has(school)) {
      bestPlacingsBySchool.set(school, new Map());
    }
    if (!bestPlacingsBySchool.get(school)?.has(event)) {
      bestPlacingsBySchool
        .get(school)
        ?.set(event, placing.isolatedPoints as number);
    } else {
      bestPlacingsBySchool
        .get(school)
        ?.set(
          event,
          compare(
            bestPlacingsBySchool.get(school)?.get(event) as number,
            placing.isolatedPoints as number
          )
        );
    }
  });

  const placingsRep: PlacingRep[] = [];
  for (const [teamNumber, eventPlacings] of bestPlacingsBySchool) {
    for (const [event, place] of eventPlacings) {
      const n =
        (eventMaxPlacings.get(event) as number) +
        (interpreter.tournament?.nOffset as number);
      const rep: PlacingRep = {
        event,
        team: teamNumber,
      } as PlacingRep;
      if (place === n) {
        rep.participated = true;
      } else if (place === n + 1) {
        rep.participated = false;
      } else if (place === n + 2) {
        rep.disqualified = true;
      } else {
        rep.place = place;
      }

      placingsRep.push(rep);
    }
  }

  const tournamentRep: TournamentRep = {
    ...interpreter.tournament.rep,
  };

  tournamentRep["n offset"] =
    (interpreter.tournament.nOffset as number) +
    ((interpreter.tournament.teams?.length as number) - teamNumbers.size);

  return {
    superscore: true,

    Tournament: tournamentRep,
    Events: interpreter.events.map((e) => e.rep),
    Teams: teams,
    Placings: placingsRep,
    Tracks: [],
    Penalties: [],
  };
};
