'use strict';
// stdlib
import { test } from 'tap';

// module under test
import als from 'als-unhooked';

test('maps', function(t) {
	t.plan(1);

	als.enterWith(new Map([['baz', 'bak']]));

	process.nextTick(() => {
		t.equal(als.get('baz'), 'bak');
	});
});

test('enter and exit', function(t) {
	t.plan(3);

	als.enterWith({ foo: 'bar' });

	process.nextTick(() => {
		t.equal(als.get('foo'), 'bar');

		als.exit(() => {
			t.notOk(als.get('foo'));
			t.notOk(als.getStore());
		});
	});

});

test('defaultInstance', function(t) {
	t.plan(1);

	t.ok(als[Object.getOwnPropertySymbols(als)[0]]);
});
