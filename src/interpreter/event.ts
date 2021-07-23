import Model from "./model";
import Raw from "./raw";
import type { EventRep, Interpreter, Tournament, Placing, Team } from "./types";

export default class Event implements Model<EventRep> {
  rep: EventRep;

  // references (access after link)
  tournament?: Tournament;
  placings?: Placing[];
  placingsByTeam?: Map<Team, Placing>;
  raws?: Raw[];

  // rep properties
  name: string;
  trial: boolean;
  trialed: boolean;

  // computed
  lowScoreWins: boolean;
  highScoreWins: boolean;
  maximumPlace?: number;

  constructor(rep: EventRep) {
    this.rep = rep;

    this.name = rep.name;
    this.trial = rep.trial ?? false;
    this.trialed = rep.trialed ?? false;

    this.lowScoreWins = rep.scoring === "low";
    this.highScoreWins = !this.lowScoreWins;
  }

  link(interpreter: Interpreter): void {
    this.tournament = interpreter.tournament;

    this.placings = interpreter.placings.filter((p) => p.event === this);
    this.placingsByTeam = this.placings.reduce((acc, p) => {
      acc.set(p.team as Team, p);
      return acc;
    }, new Map<Team, Placing>());

    this.raws = this.placings
      .filter((p) => p.raw !== undefined)
      .map((p) => p.raw as Raw)
      .sort(Raw.sortKey);

    this.maximumPlace =
      this.tournament?.perEventN !== undefined
        ? this.perEventMaximumPlace()
        : this.placings?.length;
  }

  placingFor(team: Team): Placing | undefined {
    return this.placingsByTeam?.get(team);
  }

  private perEventMaximumPlace(): number {
    return (
      (this.tournament?.perEventN === "participation"
        ? this.competingTeamsCount()
        : this.placings?.reduce((acc, p) => {
            return acc > (p.place as number) ? acc : p.place;
          }, 0)) ?? 0
    );
  }

  private competingTeamsCount(): number {
    return (
      (this.trial
        ? this.placings?.filter((p) => p.participated)?.length
        : this.placings?.filter(
            (p) => p.participated && !(p.team?.exhibition || p.exempt)
          )?.length) ?? 0
    );
  }
}
