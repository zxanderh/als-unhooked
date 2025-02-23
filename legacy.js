import debug from 'debug';
import assert from 'node:assert';
import util from 'node:util';
const d = debug('als:legacy');
import ALS from './als.js';

const NAMESPACES_SYMBOL = Symbol('cls@namespaces');
const CONTEXTS_SYMBOL = Symbol('cls@contexts');
const ERROR_SYMBOL = Symbol('error@context');

/** @type {{ [key: string]: Namespace }} */
const namespaces = process[NAMESPACES_SYMBOL] ||= {};

let wrapEmitter;
try {
	wrapEmitter = (await import('emitter-listener')).default;
	d('emitter-listener loaded');
} catch {
	d('emitter-listener NOT loaded');
}

export function createNamespace(name) {
	d('createNamespace', name);
	if (!name) {
		throw new Error('Namespace must be given a name.');
	}
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

export function destroyNamespace(namespace) {
	if (typeof namespace !== 'string') {
		assert.ok(namespace instanceof Namespace, '"namespace" param should be string or instanceof Namespace');
		namespace = namespace.name;
	}
	d('destroyNamespace', namespace);
	if (namespaces[namespace]) {
		namespaces[namespace].destroy();
		delete namespaces[namespace];
	}
}

export function reset() {
	d('reset');
	Reflect.ownKeys(namespaces).forEach((name) => {
		destroyNamespace(namespaces[name]);
	});
}

export class Namespace extends ALS {
	constructor(name) {
		super();
		this.name = name;
		this._indent = 0;
	}

	get indentStr() { return ' '.repeat(this._indent < 0 ? 0 : this._indent); }
	get active() { return this.getStore(); }

	get(key) {
		const store = this.getStore();
		return store ? get(store, key) : undefined;
	}
	set(key, value) {
		const store = this.getStore();
		if (store) {
			set(store, key, value);
		}
	}

	createContext() {
		const store = this.getStore();
		// Prototype inherit existing context if created a new child context within existing context.
		const context = store?.entries ? new Map(store.entries()) : Object.create(store ? store : Object.prototype);
		set(context, '_ns_name', this.name);
		d(`${this.indentStr}CONTEXT-CREATED Context: (${this.name}) context:${util.inspect(context, {showHidden:true, depth:2, colors:true})}`);
		return context;
	}

	run(fn) {
		void this.runAndReturn(fn);
	}

	runAndReturn(fn) {
		const context = this.createContext();
		return this.asyncLocalStorage.run(context, () => {
			try {
				d(`${this.indentStr}CONTEXT-RUN BEGIN: (${this.name}) context:${util.inspect(context)}`);
				fn(context);
				return context;
			} catch (exception) {
				if (exception) {
					exception[ERROR_SYMBOL] = context;
				}
				throw exception;
			} finally {
				d(`${this.indentStr}CONTEXT-RUN END: (${this.name}) ${util.inspect(context)}`);
			}
		});
	}

	/**
	 * Uses global Promise and assumes Promise is als friendly or wrapped already.
	 * @param {function} fn
	 * @returns {*}
	 */
	runPromise(fn) {
		const context = this.createContext();
		this.enterWith(context);

		const promise = fn(context);
		if (!promise || !promise.then || !promise.catch) {
			throw new Error('fn must return a promise.');
		}

		d(`CONTEXT-runPromise BEFORE: (${this.name}) ${util.inspect(context)}`);

		return promise
			.then(result => {
				d(`CONTEXT-runPromise AFTER then: (${this.name}) ${util.inspect(context)}`);
				this.exit(context);
				return result;
			})
			.catch(err => {
				err[ERROR_SYMBOL] = context;
				d(`CONTEXT-runPromise AFTER catch: (${this.name}) ${util.inspect(context)}`);
				this.exit(context);
				throw err;
			});
	}

	bindFactory(fn, context) {
		if (!context) {
			context = this.active || this.createContext();
		}

		const self = this;
		return this.bind(function nsBind() {
			try {
				return fn.apply(this, arguments);
			} catch (exception) {
				if (exception) {
					exception[ERROR_SYMBOL] = context;
				}
				throw exception;
			} finally {
				self.exit(context);
			}
		}, context);
	}

	destroy() {
		this.asyncLocalStorage.disable();
	}

	bind(fn, ctx = null) {
		if (!ctx) {
			return super.bind(fn);
		}
		return this.asyncLocalStorage.run.bind(this.asyncLocalStorage, ctx, fn);
	}

	bindEmitter(emitter) {
		assert(wrapEmitter, 'optional dependency "emitter-listener" must be installed to use Namespace#bindEmitter()!');
		assert(emitter.on && emitter.addListener && emitter.emit, 'can only bind real EEs');

		const namespace = this;
		const thisSymbol = 'context@' + this.name;

		// Capture the context active at the time the emitter is bound.
		function attach(listener) {
			if (!listener) {
				return;
			}
			if (!listener[CONTEXTS_SYMBOL]) {
				listener[CONTEXTS_SYMBOL] = Object.create(null);
			}

			listener[CONTEXTS_SYMBOL][thisSymbol] = {
				namespace: namespace,
				context: namespace.active,
			};
		}

		// At emit time, bind the listener within the correct context.
		function bind(unwrapped) {
			if (!unwrapped?.[CONTEXTS_SYMBOL]) {
				return unwrapped;
			}

			let wrapped = unwrapped;
			const unwrappedContexts = unwrapped[CONTEXTS_SYMBOL];
			Object.values(unwrappedContexts).forEach(function(thunk) {
				wrapped = thunk.namespace.bind(wrapped, thunk.context);
			});
			return wrapped;
		}

		wrapEmitter(emitter, attach, bind);
	}

	/**
	 * If an error comes out of a namespace, it will have a context attached to it.
	 * This function knows how to find it.
	 *
	 * @param {Error} exception Possibly annotated error.
	 */
	fromException(exception) {
		return exception[ERROR_SYMBOL];
	}
}

function get(obj, key) {
	return obj.get && obj.set ? obj.get(key) : obj[key];
}

function set(obj, key, value) {
	obj.get && obj.set ? obj.set(key, value) : obj[key] = value;
}

export default {
	getNamespace,
	createNamespace,
	getOrCreateNamespace,
	destroyNamespace,
	reset,
	Namespace,
	ERROR_SYMBOL,
	NAMESPACES_SYMBOL,
};
