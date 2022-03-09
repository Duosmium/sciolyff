import type { RawRep } from "./types.js";

export default class Raw {
  rep: RawRep;
  lowScoreWins: boolean;

  score: number;
  tiered: boolean;
  tier: number;
  lostTiebreaker: boolean;
  tiebreakerRank: number;

  constructor(rep: RawRep, lowScoreWins: boolean) {
    this.rep = rep;
    this.lowScoreWins = lowScoreWins;

    this.score = rep.score;
    this.tier = rep.tier ?? 1;
    this.tiered = this.tier > 1;
    this.tiebreakerRank = rep["tiebreaker rank"] ?? 1;
    this.lostTiebreaker = this.tiebreakerRank > 1;
  }

  static sortKey(this: void, a: Raw, b: Raw): number {
    if (a.lowScoreWins !== b.lowScoreWins) {
      throw new Error("raw comparisons must use the same score ordering");
    }

    // sort first by tier, then score, then tiebreaker rank
    // default sort is ascending so we flip the order of score if high score wins
    return (
      a.tier - b.tier ||
      (a.lowScoreWins ? a.score - b.score : b.score - a.score) ||
      a.tiebreakerRank - b.tiebreakerRank
    );
  }

  static eq(a: Raw, b: Raw): boolean {
    return (
      a.score === b.score &&
      a.tier === b.tier &&
      a.tiebreakerRank === b.tiebreakerRank
    );
  }
}
