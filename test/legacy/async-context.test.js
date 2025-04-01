'use strict';

import { expect } from 'chai';
import cls from 'als-unhooked/legacy';

describe('cls simple async local context', function() {

	it('asynchronously propagating state with local-context', function(done) {
		var namespace = cls.createNamespace('namespace');
		expect(process[cls.NAMESPACES_SYMBOL].namespace, 'namespace has been created');

		namespace.run(function() {
			namespace.set('test', 1337);
			expect(namespace.get('test')).equal(1337, 'namespace is working');
			done();
		});
	});
});
