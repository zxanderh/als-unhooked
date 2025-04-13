import conv from '@commitlint/config-conventional';

export default {
	extends: ['@commitlint/config-conventional'],
	rules: {
		'type-enum': [ 2, 'always', [
			'build',
			'chore',
			'ci',
			'docs',
			'feat',
			'fix',
			'perf',
			'refactor',
			'revert',
			'style',
			'test',
			'util',
		]],
	},
	prompt: {
		questions: {
			type: {
				...conv.prompt.questions.type,
				util: {
					description: 'Changes to code or other non-doc resources used by contributors',
					title: 'Utility (dev)',
					emoji: '✨',
				},
			},
		},
	},
};
