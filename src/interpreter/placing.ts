import Model from "./model.js";
import Raw from "./raw.js";
import type {
  PlacingRep,
  Interpreter,
  Tournament,
  Event,
  Team,
} from "./types.js";

export default class Placing implements Model<PlacingRep> {
  rep: PlacingRep;

  // references (access after link)
  tournament?: Tournament;
  event?: Event;
  team?: Team;
  interpreter?: Interpreter;

  // rep properties
  participated: boolean;
  disqualified: boolean;
  exempt: boolean;
  unknown: boolean;
  explicit: boolean;
  trackPlace?: number;

  // computed
  hasRaw: boolean;
  didNotParticipate: boolean;
  participationOnly?: boolean;
  droppedAsPartOfWorstPlacings?: boolean;
  raw?: Raw;
  tie?: boolean;
  place?: number;

  initiallyConsideredForTeamPoints?: boolean;
  consideredForTeamPoints?: boolean;

  isolatedPoints?: number;
  isolatedTrackPoints?: number;
  points?: number;
  trackPoints?: number;

  pointsAffectedByExhibition?: boolean;
  pointsLimitedByMaximumPlace?: boolean;

  medal: number | false;
  trackMedal: number | false;

  _trackExhibitonPlacingsBehind?: number;
  _exhibitionPlacingsBehind?: number;

  constructor(rep: PlacingRep) {
    this.rep = rep;

    this.participated = rep.participated ?? rep.participated === undefined;
    this.disqualified = rep.disqualified ?? false;
    this.exempt = rep.exempt ?? false;
    this.unknown = rep.unknown ?? false;
    this.explicit = rep.explicit ?? false;
    this.trackPlace = this.explicit ? rep.trackPlace : undefined;

    this.hasRaw = rep.raw !== undefined;
    this.didNotParticipate = !this.participated;

    this.medal = false;
    this.trackMedal = false;
  }

  link(interpreter: Interpreter): void {
    this.interpreter = interpreter;
    this.tournament = interpreter.tournament;

    this.event = interpreter.events.find(
      (e) => e.name === this.rep.event
    ) as Event;
    this.team = interpreter.teams.find((t) => t.number === this.rep.team);

    this.raw = this.hasRaw
      ? new Raw(this.rep.raw, this.event.lowScoreWins)
      : undefined;

    this.initiallyConsideredForTeamPoints = !(
      this.event.trial ||
      this.event.trialed ||
      this.exempt
    );
  }

  computePlaces(): void {
    if (!this.event) {
      throw new Error("things are undefined");
    }

    this.tie = this.hasRaw
      ? (this.event.raws?.filter((r) => Raw.eq(r, this.raw as Raw))?.length ??
          0) > 1
      : this.rep.tie === true;

    this.place =
      this.explicit || !this.hasRaw
        ? this.rep.place
        : (this.event.raws?.findIndex((r) => Raw.eq(r, this.raw as Raw)) ?? 0) +
          1;
  }

  computeIsolatedPoints(): void {
    if (!this.event || !this.tournament) {
      throw new Error("things are undefined");
    }

    this.participationOnly =
      this.participated &&
      this.place === undefined &&
      !this.disqualified &&
      !this.unknown;

    this.isolatedPoints = this.explicit
      ? this.place
      : (() => {
          if (
            this.tournament.reverseScoring &&
            (this.disqualified ||
              this.didNotParticipate ||
              this.participationOnly)
          ) {
            return 0;
          }

          const maxPlace = this.event.maximumPlace as number;
          const n = maxPlace + (this.tournament.nOffset as number);
          if (this.disqualified) return n + 2;
          if (this.didNotParticipate || this.unknown) return n + 1;
          if (this.participationOnly) return n;
          return Math.min(
            this.calculatePoints(false),
            this.interpreter?.isSuperscore ? Infinity : maxPlace
          );
        })();

    if (!this.tournament.reverseScoring) {
      if (
        this.isolatedPoints != undefined &&
        this.isolatedPoints > 0 &&
        this.isolatedPoints <=
          ((this.event.medals as number) || (this.tournament.medals as number))
      ) {
        this.medal = this.isolatedPoints;
      }
    } else {
      if (
        this.isolatedPoints != undefined &&
        this.isolatedPoints !== 0 &&
        this.isolatedPoints >
          (this.event.bestScore as number) -
            ((this.event.medals as number) ||
              (this.tournament.medals as number))
      ) {
        this.medal = (this.event.bestScore as number) - this.isolatedPoints + 1;
      }
    }
  }

  computeTrackPlaces(): void {
    if (!this.team || !this.event || !this.tournament) {
      throw new Error("things are undefined");
    }

    this.trackPlace ||=
      (this.team.track?.placings
        ?.filter((p) => p.event === this.event)
        ?.sort(
          (a, b) =>
            ((a.isolatedPoints as number) - (b.isolatedPoints as number)) *
            (this.tournament?.reverseScoring ? -1 : 1)
        )
        ?.findIndex((p) => p === this) ?? 0) + 1;

    this.isolatedTrackPoints = this.explicit
      ? this.trackPlace
      : (() => {
          if (
            this.tournament.reverseScoring &&
            (this.disqualified ||
              this.didNotParticipate ||
              this.participationOnly)
          ) {
            return 0;
          }

          if (!this.team.track) return 0;
          const maxPlace = this.team.track.maximumPlace as number;
          const n = maxPlace + (this.tournament.nOffset as number);
          if (this.disqualified) return n + 2;
          if (this.didNotParticipate) return n + 1;
          if (this.participationOnly || this.unknown) return n;
          return Math.min(
            this.calculatePoints(true),
            this.interpreter?.isSuperscore ? Infinity : maxPlace
          );
        })();

    if (!this.tournament.reverseScoring) {
      if (
        this.isolatedTrackPoints != undefined &&
        this.isolatedTrackPoints > 0 &&
        this.isolatedTrackPoints <=
          ((this.event.medals as number) || (this.team.track?.medals as number))
      ) {
        this.trackMedal = this.isolatedTrackPoints;
      }
    } else {
      if (
        this.isolatedTrackPoints != undefined &&
        this.isolatedTrackPoints !== 0 &&
        this.isolatedTrackPoints >
          (this.event.bestScore as number) -
            ((this.event.medals as number) ||
              (this.tournament.medals as number))
      ) {
        this.medal =
          (this.event.bestScore as number) - this.isolatedTrackPoints + 1;
      }
    }
  }

  // compute teams worstPlacingsToBeDropped before running this
  computeDrops(): void {
    if (!this.team) {
      throw new Error("things are undefined");
    }
    this.droppedAsPartOfWorstPlacings =
      this.team.worstPlacingsToBeDropped?.includes(this) ?? false;
    this.consideredForTeamPoints =
      this.initiallyConsideredForTeamPoints &&
      !this.droppedAsPartOfWorstPlacings;
  }

  computePoints(): void {
    if (!this.tournament || !this.event) {
      throw new Error("things are undefined");
    }

    this.points = !this.consideredForTeamPoints ? 0 : this.isolatedPoints;
    this.trackPoints = !this.consideredForTeamPoints
      ? 0
      : this.isolatedTrackPoints;

    this.pointsAffectedByExhibition =
      this.consideredForTeamPoints &&
      this.place !== undefined &&
      !(this.exhibitionPlacingsBehind(false) === 0);

    this.pointsLimitedByMaximumPlace =
      this.tournament?.hasCustomMaximumPlace &&
      (this.unknown ||
        (this.place === undefined &&
          (this.calculatePoints(false) > (this.event.maximumPlace as number) ||
            (this.calculatePoints(false) === this.event.maximumPlace &&
              this.tie))));
  }

  private calculatePoints(inTrack: boolean): number {
    const place = inTrack ? this.trackPlace : this.place;
    return (
      this.event?.trial
        ? place
        : this.tournament?.reverseScoring
        ? (place as number) + this.exhibitionPlacingsBehind(inTrack)
        : (place as number) - this.exhibitionPlacingsBehind(inTrack)
    ) as number;
  }

  private exhibitionPlacingsBehind(inTrack: boolean): number {
    if (inTrack) {
      return (this._trackExhibitonPlacingsBehind ||=
        this.event?.placings?.filter(
          (p) =>
            (p.exempt || p.team?.exhibition) &&
            p.team?.track === this.team?.track &&
            p.trackPlace &&
            (this.tournament?.reverseScoring
              ? p.trackPlace > (this.trackPlace as number)
              : p.trackPlace < (this.trackPlace as number))
        ).length) as number;
    } else {
      return (this._exhibitionPlacingsBehind ||= this.event?.placings?.filter(
        (p) =>
          (p.exempt || p.team?.exhibition) &&
          p.place &&
          (this.tournament?.reverseScoring
            ? p.place > (this.place as number)
            : p.place < (this.place as number))
      ).length) as number;
    }
  }
}
