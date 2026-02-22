import eslint from '@eslint/js';
import functional from 'eslint-plugin-functional';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

type RuleOptions<R> = R extends { create(context: Readonly<{ options: infer O }>): unknown }
	? O
	: never;

type RawImmutableConfig = RuleOptions<(typeof functional.rules)['prefer-immutable-types']>[0];
type ImmutableOverride = NonNullable<RawImmutableConfig['overrides']>[number];

type PreferImmutableTypesConfig = Partial<Omit<RawImmutableConfig, 'overrides'>> & {
	overrides?: Array<
		Omit<ImmutableOverride, 'options'> & {
			options?: Partial<NonNullable<ImmutableOverride['options']>>;
		}
	>;
};

export default tseslint.config(
	{ ignores: ['worker-configuration.d.ts'] },
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
			},
		},
	},
	{
		plugins: {
			functional,
			'simple-import-sort': simpleImportSort,
			'unused-imports': unusedImports,
		},
		rules: {
			// Core purity (enforced with errors)
			'no-var': 'error',
			'functional/no-let': 'error',
			'functional/immutable-data': 'error',
			'functional/no-classes': 'error',
			'no-param-reassign': 'error',

			// Good FP habits (warnings are fine)
			'functional/no-loop-statements': 'warn',
			'functional/prefer-immutable-types': [
				'error',
				{
					enforcement: 'ReadonlyDeep',
					ignoreInferredTypes: true,
					returnTypes: 'None',
					variables: 'None',
					parameters: {
						ignoreTypePattern: ['^z\\.Zod', '^ZodType'],
					},
					overrides: [
						{
							specifiers: [
								{ from: 'lib', pattern: 'RequestInit' },
								{ from: 'lib', pattern: 'Response' },
								{ from: 'lib', pattern: 'Request' },
							],
							options: { enforcement: 'ReadonlyShallow' },
						},
						{
							specifiers: [{ from: 'file', pattern: 'DeepReadonly' }],
							options: { enforcement: 'None' },
						},
					],
				} satisfies PreferImmutableTypesConfig,
			],

			// TypeScript specific rules
			'@typescript-eslint/switch-exhaustiveness-check': 'error',
			'@typescript-eslint/restrict-template-expressions': [
				'error',
				{
					allowNumber: true,
				},
			],

			// Unused vars/imports (replace TS built-in for better import detection)
			'@typescript-eslint/no-unused-vars': 'off',
			'unused-imports/no-unused-imports': 'error',
			'unused-imports/no-unused-vars': [
				'error',
				{
					args: 'all',
					argsIgnorePattern: '^_',
					caughtErrors: 'all',
					caughtErrorsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					varsIgnorePattern: '^_|Schema$',
					ignoreRestSiblings: true,
				},
			],

			// NOTE: eslint-plugin-neverthrow (installed) is NOT activated here.
			// It uses the legacy context.parserServices.program API which is
			// incompatible with typescript-eslint v8's projectService mode.
			// Re-evaluate when the plugin supports the newer getTypeAtLocation() API.

			// Syntax/style
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
			'object-shorthand': ['error', 'always'],
		},
	},
	{
		files: ['eslint.config.mts'],
		extends: [tseslint.configs.disableTypeChecked],
	},
);
