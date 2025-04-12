'use strict';
// stdlib
import { test } from 'tap';
import { EventEmitter } from 'events';

// module under test
import als from 'als-unhooked/legacy';

// multiple contexts in use
const tracer = als.createNamespace('tracer');


test('simple tracer built on contexts', function(t) {
	t.plan(7);

	const harvester = new EventEmitter();

	harvester.on('finished', function(transaction) {
		t.ok(transaction, 'transaction should have been passed in');
		t.equal(transaction.status, 'ok', 'transaction should have finished OK');
		t.equal(process[als.NAMESPACES_SYMBOL].size, 1, 'Should only have one namespace.');
	});

	const returnValue = {};

	const returnedValue = tracer.runAndReturn(function() {
		t.ok(tracer.active, 'tracer should have an active context');
		tracer.set('transaction', {status : 'ok'});
		t.ok(tracer.get('transaction'), 'can retrieve newly-set value');
		t.equal(tracer.get('transaction').status, 'ok', 'value should be correct');

		harvester.emit('finished', tracer.get('transaction'));

		return returnValue;
	});

	t.equal(returnedValue, returnValue, 'method should pass through return value of function run in scope');
});
