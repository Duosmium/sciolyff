/*
 * This is the convert script for the legacy convert spreadsheet (before June 2022).
 */

import {
  genEvents,
  genPenalties,
  genPlacings,
  genTeams,
  genTournament,
  genTracks,
} from "./helpers.js";

export default function legacyConvert(csv: string[][], markTies: boolean) {
  const tournament = genTournament(csv[0]);

  const events = genEvents(csv.slice(1, 3));

  const tracks = genTracks(csv.slice(3, 53));

  const teams = genTeams(csv.slice(53, 1053));

  const placings = genPlacings(teams, events, csv.slice(1053, 2053), markTies);

  const penalties = genPenalties(teams);

  return {
    Tournament: tournament,
    Events: events,
    Tracks: tracks.length > 0 ? tracks : undefined,
    Teams: teams,
    Placings: placings,
    Penalties: penalties.length > 0 ? penalties : undefined,
  };
}
