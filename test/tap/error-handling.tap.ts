'use strict';

import { test } from 'tap';
import als from 'als-unhooked/legacy';
import domain from 'domain';

test('continuation-local storage glue with a throw in the continuation chain',
	function(t) {
		const namespace = als.createNamespace('test');
		namespace.run(function() {
			const d = domain.create();
			namespace.set('outer', true);

			d.on('error', function(blerg) {
				t.equal(blerg.message, 'explicitly nonlocal exit', 'got the expected exception');
				t.ok(namespace.get('outer'), 'outer context is still active');
				t.notOk(namespace.get('inner'), 'inner context should have been exited by throw');
				// t.equal(namespace._set.length, 1, 'should be back to outer state');

				als.destroyNamespace('test');
				t.end();
			});

			// tap is only trying to help
			process.nextTick(d.bind(function() {
				t.ok(namespace.get('outer'), 'outer mutation worked');
				t.notOk(namespace.get('inner'), "inner mutation hasn't happened yet");

				namespace.run(function() {
					namespace.set('inner', true);
					throw new Error('explicitly nonlocal exit');
				});
			}));
		});
	});

test('synchronous throw attaches the context', function(t) {
	t.plan(3);

	const namespace = als.createNamespace('cls@synchronous');
	namespace.run(function() {
		namespace.set('value', 'transaction clear');
		try {
			namespace.run(function() {
				namespace.set('value', 'transaction set');
				throw new Error('cls@synchronous explosion');
			});
		}
		catch (e) {
			t.ok(namespace.fromException(e), 'context was attached to error');
			t.equal(namespace.fromException(e)['value'], 'transaction set',
				'found the inner value');
		}

		t.equal(namespace.get('value'), 'transaction clear', 'everything was reset');
	});

	als.destroyNamespace('cls@synchronous');
});

test('synchronous throw checks if error exists', function(t) {
	t.plan(2);

	const namespace = als.createNamespace('cls@synchronous-null-error');
	namespace.run(function() {
		namespace.set('value', 'transaction clear');
		try {
			namespace.run(function() {
				namespace.set('value', 'transaction set');
				throw null;
			});
		}

		catch {
			// as we had a null error, cls couldn't set the new inner value
			t.equal(namespace.get('value'), 'transaction clear', 'from outer value');
		}

		t.equal(namespace.get('value'), 'transaction clear', 'everything was reset');
	});

	als.destroyNamespace('cls@synchronous-null-error');
});

test('throw in process.nextTick attaches the context', function(t) {
	t.plan(3);

	const namespace = als.createNamespace('cls@nexttick2');

	const d = domain.create();
	d.once('error', function(e) {
		t.ok(namespace.fromException(e), 'context was attached to error');
		t.equal(namespace.fromException(e)['value'], 'transaction set',
			'found the inner value');

		als.destroyNamespace('cls@nexttick2');
	});

	namespace.run(function() {
		namespace.set('value', 'transaction clear');

		// tap is only trying to help
		process.nextTick(d.bind(function() {
			namespace.run(function() {
				namespace.set('value', 'transaction set');
				throw new Error('cls@nexttick2 explosion');
			});
		}));

		t.equal(namespace.get('value'), 'transaction clear', 'everything was reset');
	});
});

test('throw in setTimeout attaches the context', function(t) {
	t.plan(3);

	const namespace = als.createNamespace('cls@nexttick3');
	const d = domain.create();

	d.once('error', function(e) {
		t.ok(namespace.fromException(e), 'context was attached to error');
		t.equal(namespace.fromException(e)['value'], 'transaction set',
			'found the inner value');

		als.destroyNamespace('cls@nexttick3');
	});

	namespace.run(function() {
		namespace.set('value', 'transaction clear');

		// tap is only trying to help
		setTimeout(d.bind(function() {
			namespace.run(function() {
				namespace.set('value', 'transaction set');
				throw new Error('cls@nexttick3 explosion');
			});
		}));

		t.equal(namespace.get('value'), 'transaction clear', 'everything was reset');
	});
});
