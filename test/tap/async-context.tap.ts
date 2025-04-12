import { test } from 'tap';
import als from 'als-unhooked/modern';

test('asynchronously propagating state with local-context-domains', function(t) {
	t.plan(1);

	als.run(function() {
		als.set('test', 1337);
		t.equal(als.get('test'), 1337, 'als is working');
	});
});
