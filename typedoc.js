import { OptionDefaults } from 'typedoc';

/** @type {Partial<import("typedoc").TypeDocOptions>} */
export default {
	plugin: [
		'typedoc-plugin-missing-exports',
		'typedoc-plugin-rename-defaults',
		'./typedoc/plugin.js',
	],
	theme: 'als-unhooked',
	// treatWarningsAsErrors: true,
	useTsLinkResolution: true,
	highlightLanguages: ['typescript', 'sql', 'javascript', 'shellscript'],
	excludeReferences: true,
	groupOrder: ['Classes', 'Functions', '*', 'Interfaces', 'Type Aliases'],
	sort: ['static-first', 'source-order'],
	categoryOrder: ['modern', 'legacy'],
	visibilityFilters: {
		protected: false,
		// private: false,
		inherited: false,
		external: false,
	},
	blockTags: [...OptionDefaults.blockTags, '@copydocs'],
	notRenderedTags: ['@copydocs'],
	outputs: [
		{
			name: 'html',
			path: './docs',
			options: {
				router: 'structure',
			},
		},
	],
	externalSymbolLinkMappings: {
		'node:async_hooks': {
			AsyncLocalStorage: 'https://nodejs.org/api/async_context.html#class-asynclocalstorage',
		},
	},
};
