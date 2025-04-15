import t from 'tap';

t.test('optional emitter listener', async (t) => {
	t.plan(3);

	let legacy;
	let namespace;
	let doImport;
	const cjs = typeof require === 'function' && typeof module !== 'undefined' && module.exports;

	if (cjs) {
		doImport = () => legacy = t.mockRequire('als-unhooked/legacy', {
			'emitter-listener': undefined,
		});
	} else {
		doImport = async () => legacy = await t.mockImport('als-unhooked/legacy', {
			'emitter-listener': { get default() { throw Object.assign(new Error("Cannot find package 'emitter-listener'"), { code: 'ERR_MODULE_NOT_FOUND' }); } },
		});
	}


	await t.resolves(async () => doImport());
	t.doesNotThrow(() => namespace = legacy.createNamespace('test'));
	t.throws(() => namespace.bindEmitter(), {
		message: 'optional dependency "emitter-listener" must be installed to use Namespace#bindEmitter()!',
	});
});
