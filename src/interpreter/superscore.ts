// superscores a sciolyff interpreter
//
// this currently does not support tracks or penalties, so the superscore
// will be for all teams combined without any penalties.
// the exported function returns a `rep` object, which
// can be passed back into the interpreter class for handling.

import type {
	Interpreter,
	Placing,
	PlacingRep,
	SciOlyFF,
	Team,
	TeamRep,
	TournamentRep,
} from "./types.js";

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

	// best place of all teams of a school, by event
	const bestPlacingsBySchool = new Map<number, Map<string, Placing>>();
	interpreter.placings.forEach((placing) => {
		const better = (a: Placing, b: Placing) =>
			(
				interpreter.tournament.reverseScoring
					? (a.isolatedPoints ?? 0) > (b.isolatedPoints ?? 0)
					: (a.isolatedPoints ?? 0) < (b.isolatedPoints ?? 0)
			)
				? a
				: b;
		const event = placing.event?.name as string;
		const school = teamNumbers.get(fsn(placing.team as Team)) as number;
		if (!bestPlacingsBySchool.has(school)) {
			bestPlacingsBySchool.set(school, new Map());
		}
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		const bestPlacingsMap = bestPlacingsBySchool.get(school)!;
		const bestEvent = bestPlacingsMap.get(event);
		if (!bestEvent) {
			bestPlacingsMap.set(event, placing);
		} else {
			bestPlacingsMap.set(event, better(bestEvent, placing));
		}
	});

	const placingsRep: PlacingRep[] = [];
	for (const [teamNumber, eventPlacings] of bestPlacingsBySchool) {
		for (const place of eventPlacings.values()) {
			const rep: PlacingRep = {
				event: place.rep.event,
				team: teamNumber,
				participated: place.rep.participated,
				disqualified: place.rep.disqualified,
				exempt: place.rep.exempt,
				unknown: place.rep.unknown,
				place: place.isolatedPoints,
				explicit: true,
			};

			placingsRep.push(rep);
		}
	}

	const tournamentRep: TournamentRep = {
		...interpreter.tournament.rep,
	};

	tournamentRep["bids"] = 0;

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
