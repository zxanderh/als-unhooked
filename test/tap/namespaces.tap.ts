'use strict';
import { test } from 'tap';

import als from 'als-unhooked/legacy';

test('namespace management', function(t) {
	t.plan(8);

	// @ts-expect-error intentional error
	t.throws(function() { als.createNamespace(); }, 'name is required');

	let namespace = als.createNamespace('test');
	t.ok(namespace, 'namespace is returned upon creation');

	t.equal(als.getNamespace('test'), namespace, 'namespace lookup works');

	t.doesNotThrow(function() { als.reset(); }, 'allows resetting namespaces');

	t.equal(process[als.NAMESPACES_SYMBOL].size, 0, 'namespaces have been reset');

	// eslint-disable-next-line no-useless-assignment
	namespace = als.createNamespace('another');
	t.ok(process[als.NAMESPACES_SYMBOL].get('another'), 'namespace is available from global');

	t.doesNotThrow(function() { als.destroyNamespace('another'); },
		'destroying works');

	t.notOk(process[als.NAMESPACES_SYMBOL].get('another'), 'namespace has been removed');
});
