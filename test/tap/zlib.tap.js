'use strict';
import { test } from 'tap';
import { createNamespace } from 'als-unhooked/legacy';

import zlib from 'zlib';

test('continuation-local state with zlib', function(t) {
	t.plan(1);

	var namespace = createNamespace('namespace');
	namespace.run(function() {
		namespace.set('test', 0xabad1dea);

		t.test('deflate', function(t) {
			namespace.run(function() {
				namespace.set('test', 42);
				zlib.deflate(new Buffer('Goodbye World'), function(err) {
					if (err) {throw err;}
					t.equal(namespace.get('test'), 42, 'mutated state was preserved');
					t.end();
				});
			});
		});
	});
});
