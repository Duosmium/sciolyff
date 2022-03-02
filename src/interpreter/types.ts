import type { Asserts } from "yup";

import tournamentSchema from "../validator/tournament.js";
import eventSchema from "../validator/events.js";
import teamSchema from "../validator/teams.js";
import placingSchema from "../validator/placings.js";
import trackSchema from "../validator/tracks.js";
import penaltySchema from "../validator/penalties.js";
import rawSchema from "../validator/raws.js";

export type TournamentRep = Asserts<typeof tournamentSchema>;
export type EventRep = Asserts<typeof eventSchema>;
export type TeamRep = Asserts<typeof teamSchema>;
export type PlacingRep = Asserts<typeof placingSchema>;
export type TrackRep = Asserts<typeof trackSchema>;
export type PenaltyRep = Asserts<typeof penaltySchema>;
export type RawRep = Asserts<typeof rawSchema>;

export interface SciOlyFF {
  superscore?: boolean;

  Tournament: TournamentRep;
  Events: EventRep[];
  Teams: TeamRep[];
  Placings: PlacingRep[];

  Tracks: TrackRep[];
  Penalties: PenaltyRep[];
}

import type InterpreterClass from "./index.js";
import type TournamentClass from "./tournament.js";
import type EventClass from "./event.js";
import type TeamClass from "./team.js";
import type PlacingClass from "./placing.js";
import type TrackClass from "./track.js";
import type PenaltyClass from "./penalty.js";
import type RawClass from "./raw.js";

export type Interpreter = InterpreterClass;
export type Tournament = TournamentClass;
export type Event = EventClass;
export type Team = TeamClass;
export type Placing = PlacingClass;
export type Track = TrackClass;
export type Penalty = PenaltyClass;
export type Raw = RawClass;
