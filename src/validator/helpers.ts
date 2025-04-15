import * as yup from "yup";

// get grandparent from context
export function root(context: yup.TestContext): {
  [key: string]: any[];
  Tournament: any;
} {
  return context.from!.slice(-1)[0].value;
}
