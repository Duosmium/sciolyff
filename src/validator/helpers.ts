import * as yup from "yup";

// get grandparent from context
export function root(context: yup.TestContext): {
	[key: string]: any[] | undefined;
	Tournament: any;
} {
	return context.from!.slice(-1)[0].value;
}

export function parent(context: yup.TestContext): any[] {
	const key = context.path.split(/\W+/)[0];
	return root(context)[key] ?? [];
}
