import type Interpreter from "./index.js";

export default interface Model<Rep> {
  readonly rep: Rep;

  link(interpreter: Interpreter): void;
}
