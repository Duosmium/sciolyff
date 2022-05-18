import Model from "./model.js";
import type {
  HistoRep,
  HistoDataRep,
  Interpreter,
  Tournament,
  Event,
} from "./types.js";

export class HistoData implements Model<HistoDataRep> {
  rep: HistoDataRep;

  // references
  parent: Histogram;
  event?: Event;

  // rep properties
  start: number;
  width: number;
  counts: number[];

  constructor(rep: HistoDataRep, parent: Histogram) {
    this.rep = rep;
    this.parent = parent;

    this.start = rep.start;
    this.width = rep.width;
    this.counts = rep.counts;
  }

  link(interpreter: Interpreter): void {
    this.event = interpreter.events.find(
      (e) => e.name === this.rep.event
    ) as Event;
  }
}

export default class Histogram implements Model<HistoRep> {
  rep: HistoRep;

  // references (access after link)
  tournament?: Tournament;

  // rep properties
  type: string;
  url: string | undefined;
  data?: HistoData[];

  constructor(rep: HistoRep) {
    this.rep = rep;
    this.type = rep.type;
    this.url = rep.url;

    if (this.type === "data") {
      this.data = [];
      rep.data?.forEach((data) => {
        this.data?.push(new HistoData(data, this));
      });
    }
  }

  link(interpreter: Interpreter): void {
    this.tournament = interpreter.tournament;
  }
}
