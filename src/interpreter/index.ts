import yaml from "js-yaml";

import Tournament from "./tournament.js";
import Event from "./event.js";
import Team from "./team.js";
import Placing from "./placing.js";
import Track from "./track.js";
import Penalty from "./penalty.js";
import type { SciOlyFF } from "./types.js";

export default class Interpreter {
  rep: SciOlyFF;
  tournament: Tournament;
  events: Event[];
  teams: Team[];
  placings: Placing[];
  tracks: Track[];
  penalties: Penalty[];

  constructor(rep: string | SciOlyFF) {
    if (typeof rep === "string") {
      const loaded = yaml.load(rep) ?? {};
      if (typeof loaded === "number" || typeof loaded === "string") {
        throw new Error("Invalid YAML");
      }
      this.rep = loaded as SciOlyFF;
    } else {
      this.rep = rep;
    }

    // create models
    this.tournament = new Tournament(this.rep.Tournament);
    this.events = this.mapArrayToModels(this.rep.Events, Event);
    this.tracks = this.mapArrayToModels(this.rep.Tracks, Track);
    this.teams = this.mapArrayToModels(this.rep.Teams, Team);
    this.placings = this.mapArrayToModels(this.rep.Placings, Placing);
    this.penalties = this.mapArrayToModels(this.rep.Penalties, Penalty);

    // link models
    this.penalties.forEach((penalty) => penalty.link(this));
    this.placings.forEach((placing) => placing.link(this));
    this.teams.forEach((team) => team.link(this));
    this.tracks.forEach((track) => track.link(this));
    this.events.forEach((event) => event.link(this));
    this.tournament.link(this);

    // link teams and tracks
    this.teams.forEach((team) => {
      if (team.trackName) {
        team.addTrack(
          this.tracks.find((track) => track.name === team.trackName) as Track
        );
      }
    });

    // link computed properties
    this.penalties.forEach((penalty) => penalty.linkComputed());
    this.placings.forEach((placing) => placing.linkComputed());
    this.teams.forEach((team) => team.linkComputed());
    this.tracks.forEach((track) => track.linkComputed());
    this.events.forEach((event) => event.linkComputed());
    this.tournament.linkComputed();

    // sort events naturally
    this.events.sort((a, b) => {
      // if both events are trialed
      if (a.trial === b.trial) {
        // sort by name (alphabetically)
        if (a.name > b.name) {
          return 1;
        }
        if (a.name < b.name) {
          return -1;
        }
        return 0;
      } else {
        // one is trialed and one isn't,
        // so the one that is not trialed comes first
        return a.trial ? 1 : -1;
      }
    });

    // sort teams by rank
    this.teams.splice(
      0,
      Infinity,
      ...Array.from(
        this.teams
          .reduce((acc, t) => {
            const str = (b: boolean) => (b ? "true" : "false");
            // these keys are used for sorting later
            const key = {
              false: {
                false: 0, // non-dq normal
                true: 1, // dq normal
              },
              true: {
                false: 2, // non-dq exhib
                true: 3, // dq exhib
              },
            }[str(t.exhibition)][str(t.disqualified)];
            if (acc.has(key)) {
              (acc.get(key) as Team[]).push(t);
            } else {
              acc.set(key, [t]);
            }
            return acc;
          }, new Map<number, Team[]>())
          .entries()
      )
        .map(([key, value]): [number, Team[]] => [
          key,
          this.sortTeamsByPoints(value),
        ])
        .sort((a, b) => {
          return a[0] - b[0];
        })
        .flatMap((kv) => kv[1])
    );
  }

  private mapArrayToModels<
    Rep,
    Constructor extends new (rep: Rep) => Model,
    Model
  >(array: Rep[], objectClass: Constructor): Model[] {
    if (!array || array.length === 0) {
      return [];
    }
    return array.map((rep) => new objectClass(rep));
  }

  private sortTeamsByPoints(teams: Team[]): Team[] {
    return teams.sort((a, b) => {
      if (!a.points || !b.points) return 0;
      const cmp = a.points - b.points;
      return cmp !== 0 ? cmp : this.breakTie(a, b);
    });
  }

  // break tie based on medal counts
  private breakTie(a: Team, b: Team): number {
    if (!a.medalCounts || !b.medalCounts) return 0;
    const bCounts = b.medalCounts;
    // medal counts should be sorted descending
    // so we do b - a instead of a - b
    const result = a.medalCounts
      .map((aCount, i) => bCounts[i] - aCount)
      .find((diff) => diff !== 0);
    return result ? result : this.breakSecondTie(a, b);
  }

  // break tie based on trial events
  private breakSecondTie(a: Team, b: Team): number {
    if (!a.trialEventPoints || !b.trialEventPoints) return 0;
    const cmp = a.trialEventPoints - b.trialEventPoints;
    return cmp !== 0 ? cmp : this.breakThirdTie(a, b);
  }

  // break tie based on trial event medal counts
  private breakThirdTie(a: Team, b: Team): number {
    if (!a.trialEventMedalCounts || !b.trialEventMedalCounts) return 0;
    const bCounts = b.trialEventMedalCounts;
    // medal counts should be sorted descending
    // so we do b - a instead of a - b
    const result = a.trialEventMedalCounts
      .map((aCount, i) => bCounts[i] - aCount)
      .find((diff) => diff !== 0);
    return result ? result : this.breakSecondTie(a, b);
  }
}