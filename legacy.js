import debug from 'debug';
const d = debug('als:legacy');
import ALS from './als';

const NAMESPACES_SYMBOL = Symbol('cls@namespaces');
const CONTEXTS_SYMBOL = Symbol('cls@contexts');
const ERROR_SYMBOL = Symbol('error@context');

const namespaces = globalThis[NAMESPACES_SYMBOL] = {};

export function createNamespace(name) {
	d('createNamespace', name);
	if (namespaces[name]) {
		throw new Error(`Namespace ${name} already exists`);
	}
	const namespace = new Namespace(name);
	namespaces[name] = namespace;
	return namespace;
}

export function getNamespace(name) {
	d('getNamespace', name);
	return namespaces[name];
}

export function getOrCreateNamespace(name) {
	d('getOrCreateNamespace', name);
	return namespaces[name] || createNamespace(name);
}

export function destroyNamespace(name) {
	d('destroyNamespace', name);
	if (namespaces[name]) {
		namespaces[name].destroy();
		delete namespaces[name];
	}
}

export function reset() {
	d('reset');
	Reflect.ownKeys(namespaces).forEach((name) => {
		namespaces[name].reset();
	});
}

export default {
	getNamespace,
	createNamespace,
	getOrCreateNamespace,
	destroyNamespace,
	reset,
	ERROR_SYMBOL,
};

// ToDo: finish recreating Namespace class
class Namespace extends ALS {
	constructor(name) {
		super(name);
		this.name = name;
	}

	destroy() {
		this.reset();
	}

	run(fn) {
		this.enter();
		try {
			fn();
		} finally {
			this.exit();
		}
	}

	fromException(e) {
		return e[this.name];
	}

	set(key, value) {
		this[key] = value;
	}

	get(key) {
		return this[key];
	}

	runAndReturn() {}
	runPromise() {}
	enter() {}
	exit() {}
	bindEmitter() {}
}
