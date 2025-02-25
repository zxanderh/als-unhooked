'use strict';
import { test } from 'tap';

import als from 'als-unhooked/legacy';

test('namespace management', function(t) {
	t.plan(8);

	t.throws(function() { als.createNamespace(); }, 'name is required');

	var namespace = als.createNamespace('test');
	t.ok(namespace, 'namespace is returned upon creation');

	t.equal(als.getNamespace('test'), namespace, 'namespace lookup works');

	t.doesNotThrow(function() { als.reset(); }, 'allows resetting namespaces');

	t.equal(Object.keys(process.namespaces).length, 0, 'namespaces have been reset');

	namespace = als.createNamespace('another');
	t.ok(process.namespaces.another, 'namespace is available from global');

	t.doesNotThrow(function() { als.destroyNamespace('another'); },
		'destroying works');

	t.notOk(process.namespaces.another, 'namespace has been removed');
});
