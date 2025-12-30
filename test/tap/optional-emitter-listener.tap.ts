import t from 'tap';
import type * as Legacy from 'als-unhooked/legacy';

t.test('optional emitter listener', async (t) => {
	t.plan(3);

	let legacy: typeof Legacy;
	let namespace: Legacy.Namespace;

	const doImport = () => legacy = t.mockRequire('als-unhooked/legacy', {
		'emitter-listener': undefined,
	});


	await t.resolves(async () => doImport());
	t.doesNotThrow(() => namespace = legacy.createNamespace('test'));
	t.throws(() => namespace.bindEmitter(0 as any), {
		message: 'optional dependency "emitter-listener" must be installed to use Namespace#bindEmitter()!',
	});
});
