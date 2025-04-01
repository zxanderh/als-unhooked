/**
 * The Modern API is a re-imagining of the [cls-hooked](https://github.com/jeff-lewis/cls-hooked) interface
 * that maintains compatibility with [sequelize v6](https://github.com/sequelize/sequelize/tree/v6).
 * @module
 */

import { AsyncLocalStorage } from 'node:async_hooks';
import { Dictionary, entries, generateCodename, noop } from './util/_common.js';
import debug from 'debug';
import { ALSBase } from './util/als.base.js';
const d = debug('als:ALS');
// ToDo: debugging

/**
 * The backbone of the {@link modern Modern API}, this class provides a modern implementation for managing key-value
 * stores within asynchronous contexts. It leverages {@link AsyncLocalStorage} to create, retrieve, and
 * manipulate context-specific data.
 *
 * @template K - The type of keys in the store.
 * @template V - The type of values in the store.
 */
export class ALS<K = any, V = any> extends ALSBase<K, V, Map<K, V>> {
	protected d = d.enabled ? d.extend(generateCodename()) : noop;

	constructor() {
		super();
		this.d('constructor');
	}

	/** @hidden */
	protected createStore(defaults?: Dictionary<K, V>) {
		this.d('createStore', defaults);
		return new Map(entries(defaults));
	}

	/**
	 * Runs a function within a new store context.
	 * @param fn - The function to run.
	 * @param defaults - The default values to initialize the store with.
	 * @returns The result of the function.
	 */
	run<T>(fn: () => T, defaults?: Dictionary<K, V>) {
		const store = this.createStore(defaults);
		return this.asyncLocalStorage.run<T>(store, fn);
	}

	/**
	 * Exits the current store context and runs a function.
	 * Marked experimental as it depends on {@link AsyncLocalStorage#exit}
	 * @experimental
	 *
	 * @param fn - The function to run.
	 * @returns The result of the function.
	 */
	exit<T>(fn: () => T) {
		return this.asyncLocalStorage.exit(fn);
	}

	/**
	 * Binds a function to the current store context.
	 * Marked experimental as it depends on {@link AsyncLocalStorage.bind}
	 * @experimental
	 *
	 * @param fn - The function to bind.
	 * @returns The bound function.
	 */
	public bind<T extends () => any>(fn: T) {
		return AsyncLocalStorage.bind(fn);
	}

	/**
	 * Enters a new store context with the given default values.
	 * Marked experimental as it depends on {@link AsyncLocalStorage#enterWith}
	 * @experimental
	 *
	 * @param defaults - The default values to initialize the store with.
	 */
	public enterWith(defaults?: Dictionary<K, V>) {
		const store = this.createStore(defaults);
		return this.asyncLocalStorage.enterWith(store);
	}
}

const defaultInstance = new ALS();
const diSym = Symbol('defaultInstance');

/**
 * An extension of {@link ALS} that also acts as a singleton instance through same-named static methods.
 * The singleton pattern is convenient for basic applications that don't need multiple stores.
 *
 * @example
 * import als from 'als-unhooked';
 *
 * // Using as a singleton
 * als.run(() => {
 *   als.set('key', 'foo');
 *   console.log(als.get('key')); // Output: 'foo'
 * });
 *
 * // Using as a constructor
 * const alsInstance = new als();
 * alsInstance.run(() => {
 *   alsInstance.set('key', 'bar');
 *   console.log(alsInstance.get('key')); // Output: 'bar'
 * });
 *
 * @template K - The type of keys in the store.
 * @template V - The type of values in the store.
 *
 * @copydocs ALS
 */
class ALSGlobal extends ALS<any, any> {
	/** @private */
	static [diSym] = defaultInstance;

	static getStore<T extends Map<any, any> = Map<any, any>>() {
		return defaultInstance.getStore() as T;
	}
	static get(key: any) {
		return defaultInstance.get(key);
	}
	static set(key: any, value: any) {
		return defaultInstance.set(key, value);
	}
	static run<T>(fn: () => T, defaults?: Dictionary<any, any>) {
		return defaultInstance.run<T>(fn, defaults);
	}
	static exit<T>(fn: () => T) {
		return defaultInstance.exit<T>(fn);
	}
	static bind<T extends () => any>(fn: T) {
		return defaultInstance.bind<T>(fn);
	}
	static enterWith(defaults?: Dictionary<any, any>) {
		return defaultInstance.enterWith(defaults);
	}
}

export default ALSGlobal;
export {
	MapLike,
} from './util/_common.js';
