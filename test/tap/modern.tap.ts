'use strict';
// stdlib
import { test } from 'tap';

// module under test
import als from 'als-unhooked/modern';

test('maps', function(t) {
	t.plan(1);

	als.enterWith(new Map([['baz', 'bak']]));

	process.nextTick(() => {
		t.equal(als.get('baz'), 'bak');
	});
});

test('disable', function(t) {
	t.plan(2);

	const $als = new als();
	$als.enterWith(new Map());

	process.nextTick(() => {
		t.ok($als.getStore());
		$als.disable();
		t.notOk($als.getStore());
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
