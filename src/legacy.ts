/**
 * The Legacy API is a total drop-in replacement for [cls-hooked](https://github.com/jeff-lewis/cls-hooked).
 * @module
 */

import debug from 'debug';
import assert from 'node:assert';
import util from 'node:util';
import type EventEmitter from 'node:events';
import { Dictionary, get, isMapLike, MapLike, noop, set } from './util/_common.js';
import { ALSBase } from './util/als.base.js';
const d = debug('als:legacy');
const DEBUG_ENABLED = d.enabled;

const NAMESPACES_SYMBOL = Symbol('als@namespaces');
const CONTEXTS_SYMBOL = Symbol('als@contexts');
const ERROR_SYMBOL = Symbol('als_error@context');

const namespaces: Map<string, Namespace> =
	process[NAMESPACES_SYMBOL] ||= new Map<string, Namespace>();

// attempt to import optional dependency 'emitter-listener'
let wrapEmitter: (emitter: EventEmitter, onAddListener: (fn) => void, onEmit: (fn) => void) => void;
try {
	wrapEmitter = (await import('emitter-listener')).default;
	if (DEBUG_ENABLED) {
		d('emitter-listener loaded');
	}
} catch {
	if (DEBUG_ENABLED) {
		d('emitter-listener NOT loaded');
	}
}

/**
 * Creates a new namespace.
 * @param {string} name - The name of the namespace.
 * @returns {Namespace} The created namespace.
 *
 * @example
 * const ns = createNamespace('myNamespace');
 */
export function createNamespace<T extends Record<PropertyKey, any>>(name: string): Namespace<keyof T, T[keyof T]>;
export function createNamespace<K = any, V = any>(name: string): Namespace<K, V>;
export function createNamespace(name: string) {
	if (DEBUG_ENABLED) {
		d('createNamespace', name);
	}
	return new Namespace(name);
}

/**
 * Retrieves an existing namespace by name.
 * @param {string} name - The name of the namespace.
 * @returns {Namespace | undefined} The namespace if found, otherwise undefined.
 *
 * @example
 * const ns = getNamespace('myNamespace');
 */
export function getNamespace<T extends Record<PropertyKey, any>>(name: string): Namespace<keyof T, T[keyof T]>;
export function getNamespace<K = any, V = any>(name: string): Namespace<K, V>;
export function getNamespace(name: string) {
	if (DEBUG_ENABLED) {
		d('getNamespace', name);
	}
	return namespaces.get(name);
}

/**
 * Retrieves an existing namespace by name or creates a new one if it doesn't exist.
 * @param {string} name - The name of the namespace.
 * @returns {Namespace} The retrieved or created namespace.
 *
 * @example
 * const ns = getOrCreateNamespace('myNamespace');
 */
export function getOrCreateNamespace<T extends Record<PropertyKey, any>>(name: string): Namespace<keyof T, T[keyof T]>;
export function getOrCreateNamespace<K = any, V = any>(name: string): Namespace<K, V>;
export function getOrCreateNamespace(name: string) {
	if (DEBUG_ENABLED) {
		d('getOrCreateNamespace', name);
	}
	return namespaces.get(name) || createNamespace(name);
}

/**
 * Destroys a namespace.
 * @param {string | Namespace} namespace - The namespace to destroy.
 *
 * @example
 * destroyNamespace('myNamespace');
 */
export function destroyNamespace(namespace: string | Namespace): void {
	let name: string;
	if (typeof namespace !== 'string') {
		assert.ok(namespace instanceof Namespace, '"namespace" param should be string or instanceof Namespace');
		name = namespace.name;
	} else {
		name = namespace;
		namespace = namespaces.get(name)!;
	}
	if (DEBUG_ENABLED) {
		d('destroyNamespace', namespace);
	}
	if (namespace) {
		namespace.destroy();
		namespaces.delete(name);
	}
}

/**
 * Destroys all namespaces.
 *
 * @example
 * reset();
 */
export function reset(): void {
	if (DEBUG_ENABLED) {
		d('reset');
	}
	for (const name of Array.from(namespaces.values())) {
		destroyNamespace(name);
	}
}

/** @protected */
type Modify<T, R> = Omit<T, keyof R> & R;
/** @protected */
type WrappedEmitterFn<T extends (this: EventEmitter<any>, ...rgs) => any> = T & { __wrapped: true };

/**
 * A utility type representing an EventEmitter that has been wrapped by {@link Namespace#bindEmitter}.
 */
export type WrappedEmitter<T extends EventEmitter> = Modify<T, {
	on: WrappedEmitterFn<T['on']>;
	once: WrappedEmitterFn<T['once']>;
	addListener: WrappedEmitterFn<T['addListener']>;
	removeListener: WrappedEmitterFn<T['removeListener']>;
	emit: WrappedEmitterFn<T['emit']>;
	_events: Record<PropertyKey, Record<PropertyKey, any>>;
}>;

/**
 * The backbone of the {@link legacy Legacy API}, this class represents an object with the
 * same interface as the namespace objects in [cls-hooked](https://github.com/jeff-lewis/cls-hooked),
 * including getting/setting values and running functions in the context of the
 * associated store.
 *
 * @template K - The type of keys used in the context.
 * @template V - The type of values stored in the context.
 *
 * @example
 * const ns = new Namespace('myNamespace');	// or createNamespace('myNamespace')
 * ns.run(() => {
 *   ns.set('key', 'value');
 *   console.log(ns.get('key')); // Outputs: 'value'
 * });
 */
export class Namespace<K = any, V = any> extends ALSBase<K, V, Dictionary<K, V>> {
	name: string;
	private d: (fn: () => string) => void;
	private _indent = 0;

	constructor(name: string) {
		if (!name) {
			throw new Error('Namespace must be given a name.');
		}
		if (namespaces.has(name)) {
			throw new Error(`Namespace ${name} already exists`);
		}
		super();
		namespaces.set(name, this);
		this.name = name;
		if (DEBUG_ENABLED) {
			const dd = d.extend(name);
			// this wrapper allows us to avoid template literal evaluation if debugging isn't enabled
			this.d = (fn) => dd(fn());
		} else {
			this.d = noop as any;
		}
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
	 * @deprecated Included for backwards compatibility. Use {@link Namespace#getStore}.
	 */
	get active() { return this.getStore(); }

	/**
	 * Retrieves a value from the current context.
	 * @param key - The key to retrieve.
	 * @returns The value if found, otherwise undefined.
	 *
	 * @example
	 * const value = ns.get('key');
	 */
	get<T extends V = V>(key: K) {
		const store = this.getStore() as unknown as MapLike<K, T>;
		return store ? get<T, K>(store, key) : undefined;
	}

	/**
	 * Sets a value in the current context.
	 * @param key - The key to set.
	 * @param value - The value to set.
	 *
	 * @example
	 * ns.set('key', 'value');
	 */
	set<T extends V = V>(key: K, value: T) {
		const store = this.getStore();
		if (store) {
			set(store, key, value);
		}
	}

	/** @hidden */
	createStore(): Record<K extends PropertyKey ? K : never, V>;
	createStore<T extends Dictionary<K, V>>(defaults: T): T;
	createStore<T extends Dictionary<K, V>>(defaults?: T) {
		if (!defaults) {
			return {};
		}
		if (isMapLike(defaults)) {
			return new Map(defaults.entries());
		}
		return Object.create(defaults);
	}

	/**
	 * Creates a new context copied from the currently active context.
	 * Use this with {@link Namespace#bind}, if you want to have a fresh
	 * context at invocation time, as opposed to binding time:
	 * @returns The created context.
	 *
	 * @example
	 * function doSomething(p) {
   * 	console.log("%s = %s", p, ns.get(p));
	 * }
	 *
	 * function bindLater(callback) {
	 * 	return ns.bind(callback, ns.createContext());
	 * }
	 *
	 * setInterval(function () {
	 * 	var bound = bindLater(doSomething);
	 * 	bound('test');
	 * }, 100);
	 */
	createContext<T extends Dictionary<K, V>>(): T {
		const store = this.getStore() as T;
		// Prototype inherit existing context if created a new child context within existing context.
		const context = this.createStore<T>(store);
		set(context, '_ns_name' as K, this.name as V);
		if (DEBUG_ENABLED) {
			this.d(() => `${this.indentStr}CONTEXT-CREATED Context: (${this.name}) context:${util.inspect(context, {showHidden:true, depth:2, colors:true})}`);
		}
		return context;
	}

	/**
	 * Runs a function within the current context.
	 * @param fn - The function to run.
	 * @returns The current context.
	 *
	 * @example
	 * ns.run(() => {
	 *   // code to run within the context
	 * });
	 */
	run<T = any>(fn: (ctx?: T) => unknown) {
		return this._run(fn).context as T;
	}

	/**
	 * Runs a function within the current context and returns its result.
	 * @param fn - The function to run.
	 * @returns The result of the function.
	 *
	 * @example
	 * const result = ns.runAndReturn(() => {
	 *   // code to run within the context
	 *   return 'result';
	 * });
	 */
	runAndReturn<T>(fn: (ctx?: T) => T) {
		return this._run(fn).returnValue as T;
	}

	private _run(fn) {
		const context = this.createContext();
		return this.asyncLocalStorage.run(context, () => {
			try {
				if (DEBUG_ENABLED) {
					this.d(() => `${this.indentStr}CONTEXT-RUN BEGIN: (${this.name}) context:${util.inspect(context)}`);
				}
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
				if (DEBUG_ENABLED) {
					this.d(() => `${this.indentStr}CONTEXT-RUN END: (${this.name}) ${util.inspect(context)}`);
				}
			}
			/* c8 ignore stop */
		});
	}

	/**
	 * Runs a function that returns a promise within the current context. Assumes the Promise is als friendly or already wrapped.
	 * @param {(ctx: any) => Promise<T>} fn - The function to run.
	 * @returns {Promise<T>} The promise returned by the function.
	 *
	 * @example
	 * ns.runPromise(async () => {
	 *   // async code to run within the context
	 * });
	 */
	runPromise<T>(fn: (ctx: any) => Promise<T>): Promise<T> {
		const context = this.createContext();
		this.enterWith(context);

		const promise = fn(context);
		if (!promise || !promise.then || !promise.catch) {
			throw new Error('fn must return a promise');
		}

		if (DEBUG_ENABLED) {
			this.d(() => `CONTEXT-runPromise BEFORE: (${this.name}) ${util.inspect(context)}`);
		}

		return promise
			.then(result => {
				if (DEBUG_ENABLED) {
					this.d(() => `CONTEXT-runPromise AFTER then: (${this.name}) ${util.inspect(context)}`);
				}
				return result;
			})
			.catch(err => {
				err[ERROR_SYMBOL] = context;
				if (DEBUG_ENABLED) {
					this.d(() => `CONTEXT-runPromise AFTER catch: (${this.name}) ${util.inspect(context)}`);
				}
				throw err;
			});
	}

	/**
	 * Binds a function to a given context. Errors thrown by the bound function will have their context attached on [ERROR_SYMBOL].
	 * @param fn - The function to bind.
	 * @param [context] - The context to bind to.
	 * @returns The bound function.
	 *
	 * @example
	 * const boundFn = ns.bind(() => {
	 *   // code to run within the context
	 * });
	 * boundFn();
	 */
	bind<T extends () => any>(fn: T, context?: Dictionary<K, V>): T {
		if (!context) {
			context = this.getStore() || this.createContext();
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
	 * import { AsyncLocalStorage } from 'async_hooks';
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
	 *
	 * **NOTE**: This method will throw if the optional dependency
	 * [emitter-listener](https://github.com/othiym23/emitter-listener) is not installed.
	 *
	 * @param {EventEmitter} emitter - The EventEmitter to bind.
	 *
	 * @example
	 * ns.bindEmitter(emitter);
	 */
	bindEmitter(emitter: EventEmitter): emitter is WrappedEmitter<typeof emitter> {
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
		return true;
	}

	/**
	 * This function is intended for internal use only in the Legacy API.
	 * @hidden
	 */
	protected enterWith(defaults?: Dictionary<K, V>) {
		return super.enterWith(defaults);
	}

	/**
	 * Retrieves the context from an exception.
	 * @param {Error} exception - The exception to retrieve the context from.
	 * @returns {any} The context.
	 *
	 * @example
	 * const context = ns.fromException(error);
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
	CONTEXTS_SYMBOL,
	NAMESPACES_SYMBOL,
};

// declare `process[NAMESPACES_SYMBOL]` to satisfy typescript
declare global {
  namespace NodeJS {
    interface Process {
      [NAMESPACES_SYMBOL]: Map<string, Namespace>;
    }
  }
}
