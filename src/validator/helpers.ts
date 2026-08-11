import * as yup from "yup";

// get grandparent from context
export function root(context: yup.TestContext): {
	[key: string]: any[] | undefined;
	Tournament: any;
} {
	// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
	return context.from!.slice(-1)[0].value;
}

export function parent(context: yup.TestContext): any[] {
	const key = context.path.split(/\W+/)[0];
	return root(context)[key] ?? [];
}
