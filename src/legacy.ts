import debug from 'debug';
import assert from 'node:assert';
import util from 'node:util';
import ALS from './als.js';
import type EventEmitter from 'node:events';
import { Dictionary, get, isMapLike, MapLike, set } from './_common.js';
const d = debug('als:legacy');

// "symbols" remain as strings for backwards-compatibility with cls-hooked
const NAMESPACES_SYMBOL = 'cls@namespaces';
const CONTEXTS_SYMBOL = 'cls@contexts';
const ERROR_SYMBOL = 'error@context';

const namespaces: Record<string, Namespace> =
	process.namespaces =	// storage on `process.namespaces` remains for backwards compatibility with cls-hooked
	process[NAMESPACES_SYMBOL] ||= {};

// attempt to import optional dependency 'emitter-listener'
let wrapEmitter: (emitter: EventEmitter, onAddListener: (fn) => void, onEmit: (fn) => void) => void;
try {
	wrapEmitter = (await import('emitter-listener')).default;
	d('emitter-listener loaded');
} catch {
	d('emitter-listener NOT loaded');
}

/**
 * Creates a new namespace.
 * @param {string} name - The name of the namespace.
 * @returns {Namespace} The created namespace.
 */
export function createNamespace(name: string) {
	d('createNamespace', name);
	return new Namespace(name);
}

/**
 * Retrieves an existing namespace by name.
 * @param {string} name - The name of the namespace.
 * @returns {Namespace | undefined} The namespace if found, otherwise undefined.
 */
export function getNamespace(name: string) {
	d('getNamespace', name);
	return namespaces[name];
}

/**
 * Retrieves an existing namespace by name or creates a new one if it doesn't exist.
 * @param {string} name - The name of the namespace.
 * @returns {Namespace} The retrieved or created namespace.
 */
export function getOrCreateNamespace(name: string) {
	d('getOrCreateNamespace', name);
	return namespaces[name] || createNamespace(name);
}

/**
 * Destroys a namespace.
 * @param {string | Namespace} namespace - The namespace to destroy.
 */
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

/**
 * Destroys all namespaces.
 */
export function reset() {
	d('reset');
	Object.keys(namespaces).forEach((name) => {
		destroyNamespace(namespaces[name]);
	});
}

export class Namespace<K = any, V = any> extends ALS<K, V, Dictionary<K, V>> {
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

	getStore() {
		return super.getStore();
	}

	/**
	 * @ignore
	 * An internal utility getter used in generating debug messages.
	 */
	get indentStr() { return ' '.repeat(this._indent < 0 ? 0 : this._indent); }

	/**
	 * @deprecated Included for backwards compatibility. Use {@link getStore}.
	 */
	get active() { return this.getStore(); }

	/**
	 * Retrieves a value from the current context.
	 * @param key - The key to retrieve.
	 * @returns The value if found, otherwise undefined.
	 */
	get<T extends V = V>(key: K) {
		const store = this.getStore() as unknown as MapLike<K, T>;
		return store ? get<T, K>(store, key) : undefined;
	}

	/**
	 * Sets a value in the current context.
	 * @param key - The key to set.
	 * @param value - The value to set.
	 */
	set<T extends V = V>(key: K, value: T) {
		const store = this.getStore();
		if (store) {
			set(store, key, value);
		}
	}

	createStore<T extends Dictionary<K, V>>(defaults?: T) {
		const context = isMapLike(defaults) ? new Map(defaults.entries()) : defaults ? Object.create(defaults) as T : {} as Dictionary<K, V>;
		return context;
	}

	/**
	 * Creates a new context. This is primarily an internal utility, and shouldn't need to be called directly.
	 * @returns The created context.
	 */
	createContext() {
		const store = this.getStore();
		// Prototype inherit existing context if created a new child context within existing context.
		const context = this.createStore(store);
		set(context, '_ns_name' as K, this.name as V);
		d(`${this.indentStr}CONTEXT-CREATED Context: (${this.name}) context:${util.inspect(context, {showHidden:true, depth:2, colors:true})}`);
		return context;
	}

	/**
	 * Runs a function within the current context.
	 * @param {() => unknown} fn - The function to run.
	 * @returns {T} The current context.
	 */
	run<T = any>(fn: () => unknown) {
		return this._run(fn).context as T;
	}

	/**
	 * Runs a function within the current context and returns its result.
	 * @param {() => T} fn - The function to run.
	 * @returns {T} The result of the function.
	 */
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
	 * Runs a function that returns a promise within the current context. Assumes the Promise is als friendly or already wrapped.
	 * @param {(ctx: any) => Promise<T>} fn - The function to run.
	 * @returns {Promise<T>} The promise returned by the function.
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

	/**
	 * Binds a function to a given context. Errors thrown by the bound function will have their context attached on [ERROR_SYMBOL].
	 * @param fn - The function to bind.
	 * @param [context] - The context to bind to.
	 * @returns The bound function.
	 */
	bind<T extends () => any>(fn: T, context?: Dictionary<K, V>): T {
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

	/**
	 * @ignore
	 * Disables the underlying AsyncLocalStorage instance for this namespace.
	 * **NOTE**: Does not remove the namespace from global namespace registry. This is an internal utility method
	 * and SHOULD NOT be called directly. Use the legacy API's `destroyNamespace()` instead, e.g.
	 * ```js
	 * import { createNamespace, destroyNamespace } from 'als-unhooked/legacy';
import { AsyncLocalStorage } from 'async_hooks';
	 * const ns = createNamespace('foo');
	 * // Do stuff ...
	 * destroyNamespace('foo');
	 * ```
	 */
	destroy() {
		this.asyncLocalStorage.disable();
	}

	/**
	 * Binds an EventEmitter to the current context.
	 * @experimental
	 * @deprecated bindEmitter is kept around for backwards compatibility only. For better ways of handling EventEmitters,
	 * see [Integrating AsyncResource with EventEmitter](https://nodejs.org/api/async_context.html#integrating-asyncresource-with-eventemitter).
	 * The example is for AsyncResource, but the same concept applies. For instance,
	 * ```js
	 * namespace.set('foo', 'bar');
	 * req.on('close', namespace.bind(() => {
	 * 		namespace.get('foo');	// returns 'bar'
	 * }));
	 * ```
	 * @param {EventEmitter} emitter - The EventEmitter to bind.
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
	 * Retrieves the context from an exception.
	 * @param {Error} exception - The exception to retrieve the context from.
	 * @returns {any} The context.
	 */
	fromException(exception: Error) {
		return exception[ERROR_SYMBOL];
	}
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

// declare `process.namespaces` to satisfy typescript
declare global {
  namespace NodeJS {
    interface Process {
      namespaces?: Record<string, Namespace>;
    }
  }
}
