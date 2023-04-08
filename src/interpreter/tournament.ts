import Model from "./model.js";
import type {
  TournamentRep,
  Interpreter,
  Event,
  Team,
  Placing,
  Track,
  Penalty,
} from "./types.js";

export default class Tournament implements Model<TournamentRep> {
  rep: TournamentRep;

  // references (access after link)
  events?: Event[];
  teams?: Team[];
  placings?: Placing[];
  tracks?: Track[];
  penalties?: Penalty[];

  // rep properties
  location: string;
  level: string;
  division: string;
  year: number;
  name?: string;
  state?: string;
  medals?: number;
  trophies?: number;
  bids?: number;
  bidsPerSchool?: number;
  shortName?: string;
  worstPlacingsDropped?: number;
  exemptPlacings?: number;
  reverseScoring: boolean;
  maximumPlace?: number;
  perEventN?: string;
  nOffset?: number;
  date?: Date;
  startDate?: Date;
  endDate?: Date;
  awardsDate?: Date;
  testRelease?: string;

  // assorted calculated things
  // not sure if these are necessary?
  // just here because they're defined in the ruby version
  hasCustomMaximumPlace?: boolean;
  hasTies?: boolean;
  hasTiesOutsideOfMaximumPlaces?: boolean;
  hasTracks?: boolean;
  // for reverse scoring
  largestPlace?: number;

  nonExhibitionTeamsCount?: number;

  _topTeamsPerSchool?: Team[];
  _teamsEligibleForBids?: Team[];

  constructor(rep: TournamentRep) {
    this.rep = rep;

    this.location = rep.location;
    this.level = rep.level;
    this.division = rep.division;
    this.year = rep.year;
    this.name = rep.name;
    this.state = rep.state;

    this.medals = rep.medals;
    this.trophies = rep.trophies;

    this.bids = rep.bids ?? 0;
    this.bidsPerSchool = rep["bids per school"] ?? 1;
    this.shortName = rep["short name"];
    this.worstPlacingsDropped = rep["worst placings dropped"] ?? 0;
    this.exemptPlacings = rep["exempt placings"] ?? 0;
    this.reverseScoring = rep["reverse scoring"] ?? false;

    this.maximumPlace = rep["maximum place"];

    this.perEventN = rep["per-event n"];
    this.nOffset = rep["n offset"] ?? 0;

    this.date = rep.date ? new Date(rep.date) : undefined;
    this.startDate = rep["start date"]
      ? new Date(rep["start date"])
      : this.date;
    this.endDate = rep["end date"] ? new Date(rep["end date"]) : this.startDate;
    this.awardsDate = rep["awards date"]
      ? new Date(rep["awards date"])
      : this.endDate;
    this.testRelease = rep["test release"];
  }

  public link(interpreter: Interpreter): void {
    this.events = interpreter.events;
    this.teams = interpreter.teams;
    this.placings = interpreter.placings;
    this.tracks = interpreter.tracks;
    this.penalties = interpreter.penalties;

    this.nonExhibitionTeamsCount = this.teams.filter(
      (t) => !t.exhibition
    ).length;
    this.maximumPlace = this.maximumPlace ?? this.nonExhibitionTeamsCount;

    this.medals = this.medals ?? Math.min(this.calcMedals(), this.maximumPlace);
    this.trophies =
      this.trophies ??
      Math.min(this.calcTrophies(), this.nonExhibitionTeamsCount);

    this.hasCustomMaximumPlace =
      this.maximumPlace !== this.nonExhibitionTeamsCount;
  }

  computeProperties(): void {
    if (!this.placings || !this.tracks) {
      throw new Error("things are undefined");
    }

    this.hasTies = this.placings.some((p) => p.tie);
    this.hasTiesOutsideOfMaximumPlaces = this.placings.some(
      (p) => p.tie && !p.pointsLimitedByMaximumPlace
    );
    this.hasTracks = this.tracks.length > 0;
  }

  computeLargestPlace(): void {
    if (!this.placings) {
      throw new Error("things are undefined");
    }

    if (this.reverseScoring) {
      this.largestPlace = Math.max(...this.placings.map((p) => p.place || 0));
    }
  }

  private calcMedals() {
    // divides by 10, clamps number between 3 and 10
    return Math.min(
      Math.max(Math.ceil((this.nonExhibitionTeamsCount ?? 0) / 10), 3),
      10
    );
  }
  private calcTrophies() {
    // divides by 6, clamps number between 3 and 10
    return Math.min(
      Math.max(Math.ceil((this.nonExhibitionTeamsCount ?? 0) / 6), 3),
      10
    );
  }

  // bids logic
  public get topTeamsPerSchool(): Team[] | undefined {
    // select the first team from each school
    return (this._topTeamsPerSchool ||= Array.from(
      this.teams
        ?.reduce(
          (acc, t) =>
            acc.has(`${t.school}|${t.city ?? ""}|${t.state}`)
              ? acc
              : acc.set(`${t.school}|${t.city ?? ""}|${t.state}`, t),
          new Map<string, Team>()
        )
        .values() ?? []
    ));
  }

  public get teamsEligibleForBids(): Team[] {
    return this.bidsPerSchool === 1
      ? (this.topTeamsPerSchool as Team[])
      : (this._teamsEligibleForBids ||= Array.from(
          this.teams
            ?.reduce((acc, t) => {
              const k = [t.school, t.city, t.state];
              if (acc.has(k)) {
                (acc.get(k) as Team[]).push(t);
              } else {
                acc.set([t.school, t.city, t.state], [t]);
              }
              return acc;
            }, new Map<(string | undefined)[], Team[]>())
            ?.values() as IterableIterator<Team[]>,
          (teams) =>
            teams
              .sort((a, b) => (a.rank as number) - (b.rank as number))
              .slice(0, this.bidsPerSchool)
        )
          .flat()
          .sort((a, b) => (a.rank as number) - (b.rank as number)));
  }
}
