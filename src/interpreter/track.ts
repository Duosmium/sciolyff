import Model from "./model.js";
import type {
  TrackRep,
  Interpreter,
  Tournament,
  Team,
  Placing,
  Penalty,
} from "./types.js";

export default class Track implements Model<TrackRep> {
  rep: TrackRep;

  // references (access after link)
  tournament?: Tournament;
  teams?: Team[];
  placings?: Placing[];
  penalties?: Penalty[];

  // rep properties
  name: string;
  medals?: number;
  trophies?: number;
  nOffset?: number;

  // computed
  maximumPlace?: number;

  constructor(rep: TrackRep) {
    this.rep = rep;

    this.name = rep.name;
  }
  link(interpreter: Interpreter): void {
    this.tournament = interpreter.tournament;

    this.teams = interpreter.teams.filter((t) => t.trackName === this.rep.name);
    this.placings = interpreter.placings.filter(
      (p) => p.team?.trackName === this.rep.name
    );
    this.penalties = interpreter.penalties.filter(
      (p) => p.team?.trackName === this.rep.name
    );
  }

  computeMaximumPlace(): void {
    if (!this.tournament || !this.teams) {
      throw new Error("things are undefined");
    }

    this.medals = this.rep.medals ?? this.tournament.medals;
    this.trophies = this.rep.trophies ?? this.tournament.trophies;
    this.nOffset = this.rep["n offset"] ?? this.tournament.nOffset ?? 0;

    this.maximumPlace = Math.min(
      this.teams.filter((t) => !t.exhibition).length,
      this.tournament.maximumPlace ?? Infinity
    );
  }
}
