import t from 'tap';
import legacy from 'als-unhooked/legacy';

t.test('legacy API', async (t) => {
	t.plan(13);

	const namespace = legacy.createNamespace('test1');
	const sameNampespace = legacy.getOrCreateNamespace('test1');
	const differentNampespace = legacy.getOrCreateNamespace('test2');

	t.equal(namespace, sameNampespace);
	t.not(namespace, differentNampespace);
	t.equal(Object.keys(process.namespaces).length, 2);
	t.throws(() => legacy.createNamespace('test1'), 'Namespace test1 already exists');
	t.type(namespace.indentStr, 'string');
	namespace._indent = -1;
	t.equal(namespace.indentStr.length, 0);

	namespace.enterWith();
	namespace.set('testVal', 42);
	let testVal;
	await t.resolves(async () => {
		testVal = await namespace.runPromise(() => Promise.resolve(namespace.get('testVal')));
	});
	t.equal(testVal, 42);
	const err = await t.rejects(namespace.runPromise(() => Promise.reject(new Error('nope'))), 'nope');
	t.ok(err[legacy.ERROR_SYMBOL]);

	t.throws(() => namespace.runPromise(() => 'not a promise'), 'fn must return a promise');

	const bound = namespace.bind(() => { throw new Error('oh no'); }, { blah: 5 });
	const err2 = t.throws(() => bound());
	t.equal(err2[legacy.ERROR_SYMBOL].blah, 5);
});
