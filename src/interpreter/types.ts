import type { Asserts } from "yup";

import tournamentSchema from "../validator/tournament";
import eventSchema from "../validator/events";
import teamSchema from "../validator/teams";
import placingSchema from "../validator/placings";
import trackSchema from "../validator/tracks";
import penaltySchema from "../validator/penalties";
import rawSchema from "../validator/raws";

export type TournamentRep = Asserts<typeof tournamentSchema>;
export type EventRep = Asserts<typeof eventSchema>;
export type TeamRep = Asserts<typeof teamSchema>;
export type PlacingRep = Asserts<typeof placingSchema>;
export type TrackRep = Asserts<typeof trackSchema>;
export type PenaltyRep = Asserts<typeof penaltySchema>;
export type RawRep = Asserts<typeof rawSchema>;

export interface SciOlyFF {
  Tournament: TournamentRep;
  Events: EventRep[];
  Teams: TeamRep[];
  Placings: PlacingRep[];

  Tracks: TrackRep[];
  Penalties: PenaltyRep[];
}

import type InterpreterClass from "./index";
import type TournamentClass from "./tournament";
import type EventClass from "./event";
import type TeamClass from "./team";
import type PlacingClass from "./placing";
import type TrackClass from "./track";
import type PenaltyClass from "./penalty";
import type RawClass from "./raw";

export type Interpreter = InterpreterClass;
export type Tournament = TournamentClass;
export type Event = EventClass;
export type Team = TeamClass;
export type Placing = PlacingClass;
export type Track = TrackClass;
export type Penalty = PenaltyClass;
export type Raw = RawClass;
