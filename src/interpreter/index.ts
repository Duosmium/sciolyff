import yaml from "js-yaml";

import Tournament from "./tournament";
import Event from "./event";
import Team from "./team";
import Placing from "./placing";
import Track from "./track";
import Penalty from "./penalty";
import type { SciOlyFF } from "./types";

export default class Interpreter {
  rep: SciOlyFF;
  tournament: Tournament;
  events: Event[];
  teams: Team[];
  placings: Placing[];
  tracks: Track[];
  penalties: Penalty[];

  constructor(rep: string | SciOlyFF) {
    if (typeof rep === "string") {
      const loaded = yaml.load(rep) ?? {};
      if (typeof loaded === "number" || typeof loaded === "string") {
        throw new Error("Invalid YAML");
      }
      this.rep = loaded as SciOlyFF;
    } else {
      this.rep = rep;
    }

    // create models
    this.tournament = new Tournament(this.rep.Tournament);
    this.events = this.mapArrayToModels(this.rep.Events, Event);
    this.tracks = this.mapArrayToModels(this.rep.Tracks, Track);
    this.teams = this.mapArrayToModels(this.rep.Teams, Team);
    this.placings = this.mapArrayToModels(this.rep.Placings, Placing);
    this.penalties = this.mapArrayToModels(this.rep.Penalties, Penalty);

    // link models
    this.penalties.forEach((penalty) => penalty.link(this));
    this.placings.forEach((placing) => placing.link(this));
    this.teams.forEach((team) => team.link(this));
    this.tracks.forEach((track) => track.link(this));
    this.events.forEach((event) => event.link(this));
    this.tournament.link(this);

    // link teams and tracks
  }

  private mapArrayToModels<
    Rep,
    Constructor extends new (rep: Rep) => Model,
    Model
  >(array: Rep[], objectClass: Constructor): Model[] {
    if (array.length === 0) {
      return [];
    }
    return array.map((rep) => new objectClass(rep));
  }
}
