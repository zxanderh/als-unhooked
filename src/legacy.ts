import debug from 'debug';
import assert from 'node:assert';
import util from 'node:util';
import ALS from './als.js';
import type EventEmitter from 'node:events';
const d = debug('als:legacy');

// "symbols" remain as strings for backwards-compatibility with cls-hooked
const NAMESPACES_SYMBOL = 'cls@namespaces';
const CONTEXTS_SYMBOL = 'cls@contexts';
const ERROR_SYMBOL = 'error@context';

/** @type {{ [key: string]: Namespace }} */
const namespaces: Record<string, Namespace> =
	// @ts-ignore
	process.namespaces =	// storage on `process.namespaces` remains for backwards compatibility with cls-hooked
	// @ts-ignore
	process[NAMESPACES_SYMBOL] ||= {};

let wrapEmitter: (emitter: EventEmitter, onAddListener: (fn) => void, onEmit: (fn) => void) => void;
try {
	wrapEmitter = (await import('emitter-listener')).default;
	d('emitter-listener loaded');
} catch {
	d('emitter-listener NOT loaded');
}

export function createNamespace(name: string) {
	d('createNamespace', name);
	return new Namespace(name);
}

export function getNamespace(name: string) {
	d('getNamespace', name);
	return namespaces[name];
}

export function getOrCreateNamespace(name: string) {
	d('getOrCreateNamespace', name);
	return namespaces[name] || createNamespace(name);
}

export function destroyNamespace(namespace: string | Namespace) {
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
	Object.keys(namespaces).forEach((name) => {
		destroyNamespace(namespaces[name]);
	});
}

export class Namespace<K = any, V = any> extends ALS<K, V> {
	name: string;
	private _indent = 0;

	constructor(name: string) {
		if (!name) {
			throw new Error('Namespace must be given a name.');
		}
		if (namespaces[name]) {
			throw new Error(`Namespace ${name} already exists`);
		}
		super();
		namespaces[name] = this;
		this.name = name;
		this._indent = 0;
	}

	get indentStr() { return ' '.repeat(this._indent < 0 ? 0 : this._indent); }
	get active() { return this.getStore(); }

	get<T extends V = V>(key: K) {
		const store = this.getStore() as unknown as MapLike<K, T>;
		return store ? get<T, K>(store, key) : undefined;
	}
	set<T extends V = V>(key: K, value: T) {
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

	run<T = any>(fn: () => any) {
		return this._run(fn).context as T;
	}

	runAndReturn<T>(fn: () => T) {
		return this._run(fn).returnValue as T;
	}

	private _run(fn) {
		const context = this.createContext();
		return this.asyncLocalStorage.run(context, () => {
			try {
				d(`${this.indentStr}CONTEXT-RUN BEGIN: (${this.name}) context:${util.inspect(context)}`);
				const returnValue = fn(context);
				return { context, returnValue };
			} catch (exception) {
				if (exception) {
					exception[ERROR_SYMBOL] = context;
				}
				throw exception;
			}
			/* c8 ignore start */
			finally {
				d(`${this.indentStr}CONTEXT-RUN END: (${this.name}) ${util.inspect(context)}`);
			}
			/* c8 ignore stop */
		});
	}

	/**
	 * Uses global Promise and assumes Promise is als friendly or wrapped already.
	 * @param {function} fn
	 * @returns {*}
	 */
	runPromise<T>(fn: (ctx: any) => Promise<T>): Promise<T> {
		const context = this.createContext();
		this.enterWith(context);

		const promise = fn(context);
		if (!promise || !promise.then || !promise.catch) {
			throw new Error('fn must return a promise');
		}

		d(`CONTEXT-runPromise BEFORE: (${this.name}) ${util.inspect(context)}`);

		return promise
			.then(result => {
				d(`CONTEXT-runPromise AFTER then: (${this.name}) ${util.inspect(context)}`);
				return result;
			})
			.catch(err => {
				err[ERROR_SYMBOL] = context;
				d(`CONTEXT-runPromise AFTER catch: (${this.name}) ${util.inspect(context)}`);
				throw err;
			});
	}

	bind<T extends () => any>(fn: T, context?: any): T {
		if (!context) {
			context = this.active || this.createContext();
		}

		return this.asyncLocalStorage.run(context, () => super.bind(function nsBind() {
			try {
				// @ts-ignore
				return fn.apply(this, arguments);
			} catch (exception) {
				if (exception) {
					exception[ERROR_SYMBOL] = context;
				}
				throw exception;
			}
		} as T));
	}

	destroy() {
		this.asyncLocalStorage.disable();
	}

	/**
	 * @experimental
	 * @deprecated bindEmitter is kept around for backwards compatibility only. For better ways of handling EventEmitters,
	 * see [Integrating AsyncResource with EventEmitter](https://nodejs.org/api/async_context.html#integrating-asyncresource-with-eventemitter).
	 * The example is for AsyncResource, but the same concept applies. For example,
	 * ```js
	 * namespace.set('foo', 'bar');
	 * req.on('close', namespace.bind(() => {
	 * 		namespace.get('foo');	// returns 'bar'
	 * }));
	 * ```
	 */
	bindEmitter(emitter: EventEmitter) {
		assert(wrapEmitter, 'optional dependency "emitter-listener" must be installed to use Namespace#bindEmitter()!');
		// @ts-ignore
		assert(emitter.on && emitter.addListener && emitter.emit, 'can only bind real EEs');

		const namespace = this;
		const thisSymbol = 'context@' + this.name;

		// Capture the context active at the time the emitter is bound.
		function attach(listener) {
			/* c8 ignore start */
			if (!listener) {
				return;
			}
			/* c8 ignore stop */
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

			const unwrappedContexts = unwrapped[CONTEXTS_SYMBOL];
			for (const thunk of Object.values(unwrappedContexts) as any[]) {
				thunk.namespace.asyncLocalStorage.enterWith(thunk.context);
			}
			return unwrapped;
		}

		wrapEmitter(emitter, attach, bind);
	}

	/**
	 * If an error comes out of a namespace, it will have a context attached to it.
	 * This function knows how to find it.
	 *
	 * @param {Error} exception Possibly annotated error.
	 */
	fromException(exception: Error) {
		return exception[ERROR_SYMBOL];
	}
}

type Obj<T> = Record<PropertyKey, T>;
interface MapLike<K, V> {
	get(k: K): V;
	set(k: K, v: V): void;
};
function isMapLike(x: any): x is MapLike<unknown, unknown> {
	return typeof x?.get === 'function' && typeof x?.set === 'function';
}

function get<V, K>(obj: Obj<V>, key: K): V;
function get<V, K>(obj: MapLike<K, V>, key: K): V;
function get<V, K>(obj: Obj<V> | MapLike<K, V>, key: K) {
	return isMapLike(obj) ? obj.get(key) : obj[key as PropertyKey];
}

function set<V, K>(obj: Obj<V> | MapLike<K, V>, key: K, value: V) {
	isMapLike(obj) ? obj.set(key, value) : obj[key as PropertyKey] = value;
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
