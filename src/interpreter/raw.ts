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

  static sortKey(this: void, a: Raw, b: Raw): -1 | 0 | 1 {
    if (a.tier < b.tier) return 1;
    if (a.tier > b.tier) return -1;

    if (a.lowScoreWins !== b.lowScoreWins) {
      throw new Error("raw comparisons must use the same score ordering");
    }
    const aScore = a.lowScoreWins ? a.score : -a.score;
    const bScore = b.lowScoreWins ? b.score : -b.score;
    if (aScore < bScore) return 1;
    if (aScore > bScore) return -1;

    if (a.tiebreakerRank < b.tiebreakerRank) return 1;
    if (a.tiebreakerRank > b.tiebreakerRank) return -1;

    return 0;
  }
}
