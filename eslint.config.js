import globals from 'globals';
import pluginJs from '@eslint/js';
import mochaPlugin from 'eslint-plugin-mocha';

/** @type {import('eslint').Linter.Config[]} */
export default [
	{languageOptions: { globals: globals.node }},
	{languageOptions: { globals: globals.mocha }},
	pluginJs.configs.recommended,
	mochaPlugin.configs.flat.recommended,
	{
		files: ['**/*.js'],
		// ignores: ['**/*.test.js'],
		rules: {
			quotes: [ 'warn', 'single', { avoidEscape: true } ],
			'quote-props': [ 'warn', 'as-needed' ],
			'comma-dangle': [ 'error', 'always-multiline' ],
			'no-unused-vars': 'error',
			semi: [ 'error', 'always' ],
			indent: [ 'error', 'tab' ],
			curly: 'error',
			'eol-last': 'error',
			eqeqeq: [ 'error', 'smart' ],
			'prefer-const': 'error',
			'space-before-function-paren': [
				'error',
				{
					anonymous: 'never',
					asyncArrow: 'always',
					named: 'never',
				},
			],
			'spaced-comment': [
				'error',
				'always',
				{
					markers: [
						'/',
					],
				},
			],
			'mocha/no-setup-in-describe': 'off',
		},
	},
];
