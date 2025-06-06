'use strict';

import { test } from 'tap';
import { EventEmitter } from 'events';
import als from 'als-unhooked/legacy';

// multiple contexts in use
const tracer = als.createNamespace('tracer');

class Trace {
	harvester: EventEmitter;

	constructor(harvester: EventEmitter) {
		this.harvester = harvester;
	}

	runHandler(callback) {
		const wrapped = tracer.bind(() => {
			callback();
			this.harvester.emit('finished', tracer.get('transaction'));
		});
		wrapped();
	}
}


test('simple tracer built on contexts', function(t) {
	t.plan(6);

	const harvester = new EventEmitter();
	const trace = new Trace(harvester);

	harvester.on('finished', function(transaction) {
		t.ok(transaction, 'transaction should have been passed in');
		t.equal(transaction.status, 'ok', 'transaction should have finished OK');
		t.equal(process[als.NAMESPACES_SYMBOL].size, 1, 'Should only have one namespace.');
	});

	trace.runHandler(function inScope() {
		t.ok(tracer.active, 'tracer should have an active context');
		tracer.set('transaction', {status : 'ok'});
		t.ok(tracer.get('transaction'), 'can retrieve newly-set value');
		t.equal(tracer.get('transaction').status, 'ok', 'value should be correct');
	});
});
