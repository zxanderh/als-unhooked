'use strict';
import { test } from 'tap';

test('misc', async function(t) {
	t.plan(2);

	let doImport;
	let misc;
	const cjs = typeof require === 'function' && typeof module !== 'undefined' && module.exports;

	if (cjs) {
		doImport = () => misc = t.mockRequire('../../lib/cjs/util/_common.js', {});
	} else {
		doImport = async () => misc = await t.mockImport('../../lib/esm/util/_common.js', {});
	}


	await t.resolves(async () => doImport());
	t.equal(misc.noop(), undefined);
});
