import Model from "./model.js";
import type {
  TeamRep,
  Interpreter,
  Tournament,
  Track,
  Placing,
  Penalty,
  Event,
} from "./types.js";

export default class Team implements Model<TeamRep> {
  rep: TeamRep;

  // references (access after link)
  tournament?: Tournament;
  placings?: Placing[];
  penalties?: Penalty[];
  placingsByEvent?: Map<Event, Placing>;

  // rep properties
  school: string;
  schoolAbbreviation?: string;
  suffix?: string;
  trackName?: string;
  exhibition: boolean;
  disqualified: boolean;
  number: number;
  city?: string;
  state: string;

  track?: Track;

  // computed
  rank?: number;
  trackRank?: number;
  trophy: number | false;
  trackTrophy: number | false;
  points?: number;
  trackPoints?: number;
  earnedBid?: boolean;
  worstPlacingsToBeDropped?: Placing[];
  trialEventPoints?: number;
  trackTrialEventPoints?: number;
  medalCounts?: number[];
  trialEventMedalCounts?: number[];
  trackMedalCounts?: number[];
  trackTrialEventMedalCounts?: number[];

  constructor(rep: TeamRep) {
    this.rep = rep;

    this.school = rep.school;
    this.schoolAbbreviation = rep["school abbreviation"];
    this.suffix = rep.suffix;
    this.trackName = rep.track;
    this.exhibition = rep.exhibition ?? false;
    this.disqualified = rep.disqualified ?? false;
    this.number = rep.number;
    this.city = rep.city;
    this.state = rep.state;

    this.trophy = false;
    this.trackTrophy = false;
  }

  link(interpreter: Interpreter): void {
    this.tournament = interpreter.tournament;

    this.placings = interpreter.placings.filter((p) => p.team === this);
    this.penalties = interpreter.penalties.filter((p) => p.team === this);
    this.placingsByEvent = this.placings.reduce((acc, p) => {
      acc.set(p.event as Event, p);
      return acc;
    }, new Map<Event, Placing>());
  }

  computeWorstPlacings(): void {
    if (!this.tournament || !this.placings) {
      throw new Error("things are undefined");
    }

    this.worstPlacingsToBeDropped =
      this.tournament.worstPlacingsDropped === 0
        ? []
        : this.placings
            .filter((p) => p.initiallyConsideredForTeamPoints)
            .sort(
              (a, b) =>
                (a.isolatedPoints as number) - (b.isolatedPoints as number)
            )
            .reverse()
            .slice(0, this.tournament.worstPlacingsDropped);
  }

  computePoints(): void {
    if (
      !this.tournament ||
      !this.placings ||
      !this.penalties ||
      !this.placingsByEvent
    ) {
      throw new Error("things are undefined");
    }

    this.points =
      this.placings.reduce((sum, p) => sum + (p.points ?? 0), 0) +
      this.penalties.reduce((sum, p) => sum + (p.points ?? 0), 0);

    if (this.track) {
      this.trackPoints =
        this.placings.reduce((sum, p) => sum + (p.trackPoints ?? 0), 0) +
        this.penalties.reduce((sum, p) => sum + (p.points ?? 0), 0);
    }

    this.trialEventPoints = this.placings.reduce(
      (sum, p) =>
        (p.event as Event).trial ? sum + (p.isolatedPoints ?? 0) : sum,
      0
    );

    if (this.track) {
      this.trackTrialEventPoints = this.placings.reduce(
        (sum, p) =>
          (p.event as Event).trial ? sum + (p.isolatedTrackPoints ?? 0) : sum,
        0
      );
    }

    // array of counts of each medal
    // [ num gold, num silver, num bronze, ... ]
    this.medalCounts = Array(
      this.tournament.reverseScoring
        ? this.tournament.largestPlace
        : (this.tournament?.teams?.length as number) + 1
    )
      .fill(0)
      // this Array.fill.map thing just generates increasing numbers from 0-n
      .map(
        (_, i) =>
          this.placings?.filter(
            (p) =>
              p.consideredForTeamPoints &&
              (this.tournament?.reverseScoring
                ? p.points === (this.tournament?.largestPlace as number) - i
                : p.points === i + 1)
          ).length as number
      );
    this.trialEventMedalCounts = Array(
      this.tournament.reverseScoring
        ? this.tournament.largestPlace
        : (this.tournament?.teams?.length as number) + 1
    )
      .fill(0)
      .map(
        (_, i) =>
          this.placings?.filter(
            (p) =>
              p.event?.trial &&
              (this.tournament?.reverseScoring
                ? p.isolatedPoints ===
                  (this.tournament?.largestPlace as number) - i
                : p.isolatedPoints === i + 1)
          ).length as number
      );

    if (this.track) {
      this.trackMedalCounts = Array(
        this.tournament.reverseScoring
          ? this.tournament.largestPlace
          : (this.track?.teams?.length as number) + 1
      )
        .fill(0)
        .map(
          (_, i) =>
            this.placings?.filter(
              (p) =>
                p.consideredForTeamPoints &&
                (this.tournament?.reverseScoring
                  ? p.trackPoints ===
                    (this.tournament?.largestPlace as number) - i
                  : p.trackPoints === i + 1)
            ).length as number
        );
      this.trackTrialEventMedalCounts = Array(
        this.tournament.reverseScoring
          ? this.tournament.largestPlace
          : (this.track?.teams?.length as number) + 1
      )
        .fill(0)
        .map(
          (_, i) =>
            this.placings?.filter(
              (p) =>
                p.event?.trial &&
                (this.tournament?.reverseScoring
                  ? p.isolatedTrackPoints ===
                    (this.tournament?.largestPlace as number) - i
                  : p.isolatedTrackPoints === i + 1)
            ).length as number
        );
    }
  }

  computeRanks(): void {
    if (!this.tournament) {
      throw new Error("things are undefined");
    }

    this.rank =
      (this.tournament.teams?.findIndex(
        (t) =>
          t.points === this.points &&
          t.exhibition === this.exhibition &&
          t.disqualified === this.disqualified &&
          t.medalCounts?.every((count, i) => count === this.medalCounts?.[i]) &&
          t.trialEventPoints === this.trialEventPoints &&
          t.trialEventMedalCounts?.every(
            (count, i) => count === this.trialEventMedalCounts?.[i]
          )
      ) ?? 0) + 1;

    this.trophy =
      this.rank <= (this.tournament.trophies ?? 0) ? this.rank : false;

    if (this.track) {
      this.trackRank =
        (this.track.teams?.findIndex(
          (t) =>
            t.trackPoints === this.trackPoints &&
            t.exhibition === this.exhibition &&
            t.disqualified === this.disqualified &&
            t.trackMedalCounts?.every(
              (count, i) => count === this.trackMedalCounts?.[i]
            ) &&
            t.trackTrialEventPoints === this.trackTrialEventPoints &&
            t.trackTrialEventMedalCounts?.every(
              (count, i) => count === this.trackTrialEventMedalCounts?.[i]
            )
        ) ?? 0) + 1;

      this.trackTrophy =
        this.trackRank <= (this.track.trophies ?? 0) ? this.trackRank : false;
    }
  }

  computeEarnedBid(): void {
    if (!this.tournament) {
      throw new Error("things are undefined");
    }
    this.earnedBid = (() => {
      const rank = this.tournament.teamsEligibleForBids?.findIndex(
        (t) => t === this
      );
      return (
        rank !== undefined &&
        rank !== -1 &&
        rank < (this.tournament.bids as number)
      );
    })();
  }

  placingFor(event: Event): Placing | undefined {
    return this.placingsByEvent?.get(event);
  }

  addTrack(track: Track): void {
    this.track = track;
  }
}
