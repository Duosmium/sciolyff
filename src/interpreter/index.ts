import yaml from "js-yaml";

import Tournament from "./tournament.js";
import Event from "./event.js";
import Team from "./team.js";
import Placing from "./placing.js";
import Track from "./track.js";
import Penalty from "./penalty.js";
import Histogram from "./histograms.js";
import superscore from "./superscore.js";

import type { SciOlyFF } from "./types.js";

export default class Interpreter {
  rep: SciOlyFF;
  tournament: Tournament;
  events: Event[];
  teams: Team[];
  placings: Placing[];
  tracks: Track[];
  penalties: Penalty[];
  histograms: Histogram;

  isSuperscore: boolean;

  _superscored?: Interpreter;

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

    this.isSuperscore = this.rep.superscore ?? false;

    // create models
    this.tournament = new Tournament(this.rep.Tournament);
    this.events = this.mapArrayToModels(this.rep.Events, Event);
    this.tracks = this.mapArrayToModels(this.rep.Tracks, Track);
    this.teams = this.mapArrayToModels(this.rep.Teams, Team);
    this.placings = this.mapArrayToModels(this.rep.Placings, Placing);
    this.penalties = this.mapArrayToModels(this.rep.Penalties, Penalty);
    this.histograms = this.rep.Histograms ? new Histogram(this.rep.Histograms) : undefined;

    // link models
    this.penalties.forEach((penalty) => penalty.link(this));
    this.placings.forEach((placing) => placing.link(this));
    this.teams.forEach((team) => team.link(this));
    this.tracks.forEach((track) => track.link(this));
    this.histograms.data.forEach((data) => data.link(this));
    this.events.forEach((event) => event.link(this));
    this.histograms.link(this);
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
    this.tournament.computeProperties();
    this.tracks.forEach((track) => track.computeMaximumPlace());
    this.placings.forEach((placing) => placing.computePlaces());
    this.tournament.computeLargestPlace();
    this.events.forEach((event) => event.computeMaximumPlace());
    this.placings.forEach((placing) => placing.computeIsolatedPoints());
    if (this.tournament.hasTracks) {
      this.placings.forEach((placing) => placing.computeTrackPlaces());
    }
    this.teams.forEach((team) => team.computeWorstPlacings());
    this.placings.forEach((placing) => placing.computeDrops());
    this.placings.forEach((placing) => placing.computePoints());
    this.teams.forEach((team) => team.computePoints());
    this.sortEvents();
    this.sortTeamsByRank(this.teams, false);
    if (this.tournament.hasTracks) {
      this.tracks.forEach((track) =>
        this.sortTeamsByRank(track.teams ?? [], true)
      );
    }
    this.teams.forEach((team) => team.computeRanks());
    this.teams.forEach((team) => team.computeEarnedBid());
  }

  private sortEvents() {
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
  }

  private sortTeamsByRank(teams: Team[], track: boolean) {
    teams.splice(
      0,
      Infinity,
      ...Array.from(
        teams
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
          this.sortTeamsByPoints(value, track),
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

  private sortTeamsByPoints(teams: Team[], track: boolean): Team[] {
    const key = track ? "trackPoints" : "points";
    return teams.sort((a, b) => {
      const aPoints = a[key];
      const bPoints = b[key];
      if (!aPoints || !bPoints) return 0;
      const cmp =
        (aPoints - bPoints) * (this.tournament.reverseScoring ? -1 : 1);
      return cmp !== 0 ? cmp : this.breakTie(a, b, track);
    });
  }

  // break tie based on medal counts
  private breakTie(a: Team, b: Team, track: boolean): number {
    const key = track ? "trackMedalCounts" : "medalCounts";
    const aCounts = a[key];
    const bCounts = b[key];
    if (!aCounts || !bCounts) return 0;
    // medal counts should be sorted descending
    // so we do b - a instead of a - b
    const result = aCounts
      .map((aCount, i) => bCounts[i] - aCount)
      .find((diff) => diff !== 0);
    return result ? result : this.breakSecondTie(a, b, track);
  }

  // break tie based on trial events
  private breakSecondTie(a: Team, b: Team, track: boolean): number {
    const key = track ? "trackTrialEventPoints" : "trialEventPoints";
    const aPoints = a[key];
    const bPoints = b[key];
    if (!aPoints || !bPoints) return 0;
    const cmp = aPoints - bPoints;
    return cmp !== 0 ? cmp : this.breakThirdTie(a, b, track);
  }

  // break tie based on trial event medal counts
  private breakThirdTie(a: Team, b: Team, track: boolean): number {
    const key = track ? "trackTrialEventMedalCounts" : "trialEventMedalCounts";
    const aCounts = a[key];
    const bCounts = b[key];
    if (!aCounts || !bCounts) return 0;
    // medal counts should be sorted descending
    // so we do b - a instead of a - b
    const result = aCounts
      .map((aCount, i) => bCounts[i] - aCount)
      .find((diff) => diff !== 0);
    return result ? result : a.number - b.number;
  }

  // superscore this interpreter
  public superscore(toInterpreter: true): Interpreter;
  public superscore(toInterpreter: false): SciOlyFF;
  public superscore(toInterpreter = false) {
    if (this.isSuperscore) {
      return this;
    }

    this._superscored ||= new Interpreter(superscore(this));
    if (toInterpreter) {
      return this._superscored;
    } else {
      return this._superscored.rep;
    }
  }
}
