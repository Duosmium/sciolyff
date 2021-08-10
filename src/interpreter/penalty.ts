import Model from "./model";
import type { PenaltyRep, Interpreter, Tournament, Team } from "./types";

export default class Penalty implements Model<PenaltyRep> {
  rep: PenaltyRep;

  // references (access after link)
  tournament?: Tournament;
  team?: Team;

  // rep properties
  points: number;

  constructor(rep: PenaltyRep) {
    this.rep = rep;
    this.points = rep.points;
  }

  link(interpreter: Interpreter): void {
    this.tournament = interpreter.tournament;

    this.team = interpreter.teams.find((t) => t.number === this.rep.team);
  }

  linkComputed(): void {
    return;
  }
}
