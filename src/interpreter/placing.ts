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

  // computed
  hasRaw: boolean;
  didNotParticipate: boolean;
  participationOnly?: boolean;
  droppedAsPartOfWorstPlacings?: boolean;
  raw?: Raw;
  tie?: boolean;
  place?: number;
  trackPlace?: number;

  initiallyConsideredForTeamPoints?: boolean;
  consideredForTeamPoints?: boolean;

  isolatedPoints?: number;
  isolatedTrackPoints?: number;
  points?: number;
  trackPoints?: number;

  pointsAffectedByExhibition?: boolean;
  pointsLimitedByMaximumPlace?: boolean;

  _trackExhibitonPlacingsBehind?: number;
  _exhibitionPlacingsBehind?: number;

  constructor(rep: PlacingRep) {
    this.rep = rep;

    this.participated = rep.participated ?? rep.participated === undefined;
    this.disqualified = rep.disqualified ?? false;
    this.exempt = rep.exempt ?? false;
    this.unknown = rep.unknown ?? false;

    this.hasRaw = rep.raw !== undefined;
    this.didNotParticipate = !this.participated;
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
      ? (this.event.raws?.filter((r) => r === this.raw)?.length ?? 0) > 1
      : this.rep.tie === true;

    this.place = this.hasRaw
      ? (this.event.raws?.findIndex((r) => r === this.raw) ?? 0) + 1
      : this.rep.place;
  }

  computeIsolatedPoints(): void {
    if (!this.event || !this.tournament) {
      throw new Error("things are undefined");
    }

    this.participationOnly =
      this.participated && !this.place && !this.disqualified && !this.unknown;

    this.isolatedPoints = (() => {
      const maxPlace = this.event.maximumPlace as number;
      const n = maxPlace + (this.tournament.nOffset as number);
      if (this.disqualified) return n + 2;
      if (this.didNotParticipate) return n + 1;
      if (this.participationOnly || this.unknown) return n;
      return Math.min(
        this.calculatePoints(false),
        this.interpreter?.isSuperscore ? Infinity : maxPlace
      );
    })();
  }

  computeTrackPlaces(): void {
    if (!this.team || !this.event || !this.tournament) {
      throw new Error("things are undefined");
    }

    this.trackPlace =
      (this.team.track?.placings
        ?.filter((p) => p.event === this.event)
        ?.sort(
          (a, b) => (a.isolatedPoints as number) - (b.isolatedPoints as number)
        )
        ?.findIndex((p) => p === this) ?? 0) + 1;

    this.isolatedTrackPoints = (() => {
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
    if (inTrack) {
      return (
        this.event?.trial
          ? this.trackPlace
          : (this.trackPlace as number) - this.exhibitionPlacingsBehind(true)
      ) as number;
    } else {
      return (
        this.event?.trial
          ? this.place
          : (this.place as number) - this.exhibitionPlacingsBehind(false)
      ) as number;
    }
  }

  private exhibitionPlacingsBehind(inTrack: boolean): number {
    if (inTrack) {
      return (this._trackExhibitonPlacingsBehind ||=
        this.event?.placings?.filter(
          (p) =>
            (p.exempt || p.team?.exhibition) &&
            p.team?.track === this.team?.track &&
            p.trackPlace &&
            p.trackPlace < (this.trackPlace as number)
        ).length) as number;
    } else {
      return (this._exhibitionPlacingsBehind ||= this.event?.placings?.filter(
        (p) =>
          (p.exempt || p.team?.exhibition) &&
          p.place &&
          p.place < (this.place as number)
      ).length) as number;
    }
  }
}
