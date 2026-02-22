import eslint from '@eslint/js';
import functional from 'eslint-plugin-functional';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import unusedImports from 'eslint-plugin-unused-imports';
import tseslint from 'typescript-eslint';

type RuleOptions<R> = R extends { create(context: Readonly<{ options: infer O }>): unknown } ? O : never;

type PreferImmutableTypesConfig = Partial<RuleOptions<(typeof functional.rules)['prefer-immutable-types']>[0]>;

export default tseslint.config(
	{ ignores: ['worker-configuration.d.ts'] },
	eslint.configs.recommended,
	tseslint.configs.strictTypeChecked,
	{
		languageOptions: {
			parserOptions: {
				projectService: true,
				tsconfigRootDir: import.meta.dirname,
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
				'warn',
				{
					enforcement: 'ReadonlyShallow',
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

			// Syntax/style
			'simple-import-sort/imports': 'error',
			'simple-import-sort/exports': 'error',
			'no-restricted-imports': [
				'error',
				{
					patterns: [{ group: ['./*', '../*'], message: 'Use ~/ path alias instead of relative imports.' }],
				},
			],
			'object-shorthand': ['error', 'always'],
		},
	},
	{
		files: ['eslint.config.mts'],
		extends: [tseslint.configs.disableTypeChecked],
	},
);
