import { defineConfig, globalIgnores } from "eslint/config";
import tseslint from "typescript-eslint";
import globals from "globals";
import js from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default defineConfig([
	globalIgnores([
		"**/node_modules/",
		"**/dist/",
		"**/compare/",
		"**/.*",
		"**/tests/",
	]),
	{
		extends: [
			js.configs.recommended,
			tseslint.configs.strictTypeChecked,
			// tseslint.configs.stylisticTypeChecked,
		],

		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
			},

			parserOptions: {
				projectService: true,
			},
		},

		rules: {
			"@typescript-eslint/ban-ts-comment": [
				"error",
				{
					"ts-ignore": "allow-with-description",
				},
			],
			"@typescript-eslint/no-invalid-void-type": [
				"error",
				{ allowAsThisParameter: true },
			],
			"@typescript-eslint/restrict-template-expressions": [
				"error",
				{
					allowNumber: true,
					allowBoolean: true,
				},
			],
		},

		linterOptions: {
			reportUnusedInlineConfigs: "error",
		},
	},
	{
		files: ["src/validator/**/*"],
		ignores: ["src/validator/index.ts", "src/validator/canonical.ts"],

		rules: {
			"@typescript-eslint/no-explicit-any": "off",
			"@typescript-eslint/no-unsafe-member-access": "off",
			"@typescript-eslint/no-unsafe-call": "off",
			"@typescript-eslint/no-unsafe-return": "off",
			"@typescript-eslint/no-unsafe-assignment": "off",
			"@typescript-eslint/restrict-template-expressions": "off",
		},
	},
	{
		files: ["eslint.config.mjs"],
		extends: [tseslint.configs.disableTypeChecked],
	},
	eslintConfigPrettier,
]);
