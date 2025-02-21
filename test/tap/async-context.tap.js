'use strict';

import { test } from 'tap';
import { createNamespace } from '../../index.js';

test('asynchronously propagating state with local-context-domains', function(t) {
	t.plan(2);

	var namespace = createNamespace('namespace');
	t.ok(process.namespaces.namespace, 'namespace has been created');

	namespace.run(function() {
		namespace.set('test', 1337);
		t.equal(namespace.get('test'), 1337, 'namespace is working');
	});
});
