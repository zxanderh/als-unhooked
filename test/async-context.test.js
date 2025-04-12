'use strict';

import { expect } from 'chai';
import ALS from 'als-unhooked/modern';

describe('cls simple async local context', function() {

	it('asynchronously propagating state with local-context', function(done) {
		const namespace = new ALS();

		namespace.run(function() {
			namespace.set('test', 1337);
			expect(namespace.get('test')).equal(1337, 'namespace is working');
			done();
		});
	});

	it('asynchronously propagating state with local-context 2', function(done) {

		ALS.run(function() {
			ALS.set('test', 'foobar');
			expect(ALS.get('test')).equal('foobar', 'namespace is working');
			done();
		});
	});
});
