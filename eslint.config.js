import globals from 'globals';
import pluginJs from '@eslint/js';
import mochaPlugin from 'eslint-plugin-mocha';
import tseslint from 'typescript-eslint';
import { defineConfig } from 'eslint/config';

const ignores = ['docs/**/*', 'playground/**/*', 'lib/**/*'];

export default [
	{languageOptions: { globals: globals.node }},
	{languageOptions: { globals: globals.mocha }},
	{
		...pluginJs.configs.recommended,
		ignores: [...ignores],
	},
	{
		...mochaPlugin.configs.recommended,
		files: ['test/**/*.js'],
		ignores: ['test/tap/*.js'],
	},
	...defineConfig({
		files: ['**/*.ts'],
		ignores: ['lib/**/*', ...ignores],
		extends: [
			tseslint.configs.recommended,
		],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-this-alias': 'off',
			'@typescript-eslint/no-unused-expressions': ['error', {
				allowTernary: true,
			}],
			'@typescript-eslint/no-unused-vars': ['error', {
				varsIgnorePattern: '^_.*?',
				argsIgnorePattern: '^_.*?',
			}],
			'@typescript-eslint/ban-ts-comment': [
				'error',
				{
					// minimumDescriptionLength: 3,
					'ts-check': false,
					// 'ts-expect-error': 'allow-with-description',
					'ts-expect-error': false,
					'ts-ignore': false,
					'ts-nocheck': true,
				},
			],
			'@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
		},
	}),
	{
		files: ['**/*.js', '**/*.ts'],
		ignores: ['**/*.d.ts', ...ignores],
		rules: {
			quotes: [ 'warn', 'single', { avoidEscape: true } ],
			'quote-props': [ 'warn', 'as-needed' ],
			'comma-dangle': [ 'error', 'always-multiline' ],
			semi: [ 'error', 'always' ],
			indent: [ 'error', 'tab' ],
			curly: 'error',
			'eol-last': 'error',
			eqeqeq: [ 'error', 'smart' ],
			'prefer-const': 'error',
			'spaced-comment': [
				'error',
				'always',
				{
					markers: [
						'/',
					],
				},
			],
			'prefer-rest-params': 'off',
			'mocha/no-setup-in-describe': 'off',
		},
	},
	{
		files: ['**/*.js', '**/*.[mc]js'],
		ignores: [...ignores],
		rules: {
			'no-unused-vars': ['error', {
				varsIgnorePattern: '^_.*',
				argsIgnorePattern: '^_.*',
				caughtErrorsIgnorePattern: '^_.*',
			}],
			'space-before-function-paren': [
				'error',
				{
					anonymous: 'never',
					asyncArrow: 'always',
					named: 'never',
				},
			],
		},
	},
];
