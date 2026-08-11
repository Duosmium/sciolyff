import * as yup from "yup";

import canonical from "./canonical.js";
import { parent, root } from "./helpers.js";

export default yup.object().shape({
	// always required
	number: yup
		.number()
		.integer()
		.test(
			"unique-number",
			"duplicate team number: ${value}",
			(value, context) =>
				parent(context).filter((team) => team.number === value).length === 1,
		)
		.test(
			"correct-number-of-exempt-placings",
			"team ${value} has incorrect number of exempt placings",
			(value, context) =>
				context.parent.exhibition === true ||
				root(context).Placings?.filter(
					(placing) => placing.team === value && placing.exempt,
				).length === (root(context).Tournament["exempt placings"] ?? 0),
		)
		.required(),
	school: yup
		.string()
		.test(
			"canonical-school-name",
			"$$warn$$ non-canonical school ${value}",
			async (value, context) =>
				context.options.context?.canonical
					? await canonical(
							[
								value,
								(context.parent.city as string) || "",
								context.parent.state as string,
							],
							"schools.csv",
						)
					: true,
		)
		.required(),
	state: yup.string().required(),

	// optional
	"school abbreviation": yup.string().optional(),
	track: yup
		.string()
		.optional()
		.test(
			"matching-track",
			"'track ${value}' does not match any name in 'section Track'",
			(value, context) =>
				!value || root(context).Tracks?.some((track) => track.name === value),
		)
		.test(
			"in-track-if-possible",
			"$$warn$$ missing track for team",
			(value, context) => {
				const tracks = root(context).Tracks;
				return !!value || !tracks || tracks.length === 0;
			},
		)
		.test(
			"no-tracks-when-reverse",
			"cannot use reverse scoring with tracks",
			(value: any, context: yup.TestContext) =>
				!(value && root(context).Tournament["reverse scoring"]),
		),
	suffix: yup
		.string()

		.test(
			"unique-suffix",
			"duplicate suffix from same school: ${value}",
			(value, context) =>
				value
					? parent(context).filter(
							(team) =>
								team.school === context.parent.school &&
								team.city === context.parent.city &&
								team.state === context.parent.state &&
								team.suffix === value,
						).length === 1
					: true,
		)
		.test(
			"unnecessary-suffix",
			"$$warn$$ possible unnecessary suffix: ${value}",
			(value, context) =>
				value
					? parent(context).filter(
							(team) =>
								team.school === context.parent.school &&
								team.city === context.parent.city &&
								team.state === context.parent.state,
						).length > 1
					: true,
		)
		.optional(),
	city: yup
		.string()

		.test("unambiguous-city", "city for team is ambiguous", (value, context) =>
			value
				? true
				: !parent(context).some(
						(team) =>
							team.city &&
							team.school === context.parent.school &&
							team.state === context.parent.state,
					),
		)
		.optional(),
	disqualified: yup.boolean().optional(),
	exhibition: yup.boolean().optional(),
});
