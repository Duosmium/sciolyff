import * as yup from "yup";

export interface TestContext extends yup.TestContext {
  from: {
    value: any;
  }[];
}

// get grandparent from context
export function root(context: yup.TestContext): {
  [key: string]: any[];
  Tournament: any;
} {
  return (context as TestContext).from[1].value;
}
