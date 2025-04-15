'use strict';

// this test enables debugging for coverage purposes

process.env.DEBUG = 'als:*';

(async () => {
	await import('./modern.tap.js');
	await import('./legacy.tap.js');
	await import('./optional-emitter-listener.tap.ts');
})();
