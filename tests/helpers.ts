import type Interpreter from "../src/interpreter";

export function dumpInterpreter(interpreter: Interpreter) {
  return {
    tournament: {
      name: interpreter.tournament.name,

      date: interpreter.tournament.date,
      startDate: interpreter.tournament.startDate,
      endDate: interpreter.tournament.endDate,
      awardsDate: interpreter.tournament.awardsDate,

      nonExhibitionTeamsCount: interpreter.tournament.nonExhibitionTeamsCount,
      largestPlace: interpreter.tournament.largestPlace,
    },
    events: interpreter.events
      .map((e) => ({
        name: e.name,
        maximumPlace: e.maximumPlace,
      }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    teams: interpreter.teams
      .map((t) => ({
        number: t.number,
        school: t.school,

        rank: t.rank,
        trackRank: t.trackRank,
        trophy: t.trophy,
        trackTrophy: t.trackTrophy,
        points: t.points,
        trackPoints: t.trackPoints,
        trialEventPoints: t.trialEventPoints,
        trackTrialEventPoints: t.trackTrialEventPoints,
        medalCounts: t.medalCounts,
        trackMedalCounts: t.trackMedalCounts,
        trialEventMedalCounts: t.trialEventMedalCounts,
        trackTrialEventMedalCounts: t.trackTrialEventMedalCounts,

        worstPlacingsToBeDropped: t.worstPlacingsToBeDropped?.map(
          (p) => p.event?.name
        ),
      }))
      .sort((a, b) => a.number - b.number),
    placings: interpreter.placings
      .map((p) => ({
        event: p.event?.name,
        team: p.team?.number,

        hasRaw: p.hasRaw,
        didNotParticipate: p.didNotParticipate,
        participationOnly: p.participationOnly,
        droppedAsPartOfWorstPlacings: p.droppedAsPartOfWorstPlacings,
        raw: p.raw,
        tie: p.tie,
        place: p.place,

        initiallyConsideredForTeamPoints: p.initiallyConsideredForTeamPoints,
        consideredForTeamPoints: p.consideredForTeamPoints,

        isolatedPoints: p.isolatedPoints,
        isolatedTrackPoints: p.isolatedTrackPoints,
        points: p.points,
        trackPoints: p.trackPoints,

        pointsAffectedByExhibition: p.pointsAffectedByExhibition,
        pointsLimitedByMaximumPlace: p.pointsLimitedByMaximumPlace,

        medal: p.medal,
        trackMedal: p.trackMedal,
      }))
      .sort(
        (a, b) =>
          (a.team ?? 0) - (b.team ?? 0) ||
          (a.event ?? "").localeCompare(b.event ?? "")
      ),
    tracks: interpreter.tracks.map((t) => ({
      name: t.name,
      teams: t.teams?.map((t) => t.number),
      maximumPlace: t.maximumPlace,
    })),
    penalties: interpreter.penalties.map((p) => ({
      team: p.team?.number,
      points: p.points,
    })),
    histograms: {
      type: interpreter.histograms?.type,
      url: interpreter.histograms?.url,
      data: interpreter.histograms?.data?.map((d) => ({
        start: d.start,
        width: d.width,
        counts: d.counts,
        info: d.info,
        event: d.event?.name,
      })),
    },
  };
}
