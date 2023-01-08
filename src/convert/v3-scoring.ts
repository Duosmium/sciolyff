/*
 * This is the convert script for the v3-compatible Duos scoring system sheets,
 * which allow empty placements section (for pre-competition data).
 */

import {
  genEvents,
  genHistos,
  genPenalties,
  genPlacings,
  genTeams,
  genTournament,
  genTracks,
} from "./helpers.js";

export default function v3convertScoring(csv: string[][], markTies: boolean) {
  const tournament = genTournament(csv[1]);
  const events = genEvents(csv.slice(2, 4));
  const tracks = genTracks(csv.slice(11, 61));
  const teams = genTeams(csv.slice(61, 1061));

  const hasPlacements =
    csv[1061]?.length !== undefined && csv[1061].length !== 0;

  if (hasPlacements) {
    const histos = genHistos(events, csv.slice(4, 11));
    const placings = genPlacings(
      teams,
      events,
      csv.slice(1061, 2061),
      markTies
    );
    const penalties = genPenalties(teams);

    return {
      Tournament: tournament,
      Events: events,
      Tracks: tracks.length > 0 ? tracks : undefined,
      Teams: teams,
      Placings: placings,
      Penalties: penalties.length > 0 ? penalties : undefined,
      Histograms:
        histos.length > 0 ? { type: "data", data: histos } : undefined,
    };
  }

  return {
    Tournament: tournament,
    Events: events,
    Tracks: tracks.length > 0 ? tracks : undefined,
    Teams: teams,
  };
}
