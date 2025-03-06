'use strict';
// stdlib
import { test } from 'tap';
import { EventEmitter } from 'events';

// module under test
import als from 'als-unhooked/legacy';

// multiple contexts in use
const tracer = als.createNamespace('tracer');

class Trace {
	harvester: EventEmitter;

	constructor(harvester: EventEmitter) {
		this.harvester = harvester;
	}

	runHandler(handler) {
		const trace = tracer.run(handler);
		this.harvester.emit('finished', trace.transaction);
	}
}


test('simple tracer built on contexts', function(t) {
	t.plan(4);

	const harvester = new EventEmitter();
	const trace = new Trace(harvester);

	harvester.on('finished', function(transaction) {
		t.ok(transaction, 'transaction should have been passed in');
		t.equal(transaction.status, 'ok', 'transaction should have finished OK');
	});

	trace.runHandler(function inScope() {
		tracer.set('transaction', {status : 'ok'});
		t.ok(tracer.get('transaction'), 'can retrieve newly-set value');
		t.equal(tracer.get('transaction').status, 'ok', 'value should be correct');
	});
});
