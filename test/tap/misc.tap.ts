'use strict';
import { test } from 'tap';

import { noop } from '../../lib/util/_common.js';

test('misc', function(t) {
	t.plan(1);

	t.equal(noop(), undefined);
});
