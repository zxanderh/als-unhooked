'use strict';

import { test } from 'tap';
import { EventEmitter } from 'events';
import als from 'als-unhooked/modern';

const eventName = 'foo';
const key = 'bread';
const value = 'bowl';

test('simple tracer built on contexts', function(t) {
	t.plan(1);

	const emitter = new EventEmitter();

	als.run(() => {
		als.set(key, value);

		emitter.on(eventName, als.bind(function() {
			t.equal(als.get(key), value, 'transaction should have finished OK');
		}));
	});

	als.run(() => {
		emitter.emit(eventName);
	}, { [key]: 'wrongValue' });
});
