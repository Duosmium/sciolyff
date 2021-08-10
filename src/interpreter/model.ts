import type Interpreter from "./index";

export default interface Model<Rep> {
  readonly rep: Rep;

  link(interpreter: Interpreter): void;
  linkComputed(): void;
}
