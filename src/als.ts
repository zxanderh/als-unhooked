import { AsyncLocalStorage } from 'async_hooks';
import { Dictionary, entries, generateCodename, get, noop, set } from './util/_common.js';
import debug from 'debug';
import { ALSBase } from './util/als.base.js';
const d = debug('als:ALS');
// ToDo: debugging

export class ALS<K = any, V = any> extends ALSBase<K, V, Map<K, V>> {
	protected d = d.enabled ? d.extend(generateCodename()) : noop;

	constructor() {
		super();
		this.d('constructor');
	}

	protected createStore(defaults?: Dictionary<K, V>) {
		return new Map(entries(defaults));
	}

	/**
	 * Retrieves the current store.
	 * @returns The current store or undefined if there is no store.
	 */
	getStore() {
		return this.asyncLocalStorage.getStore();
	}

	/**
	 * Retrieves a value from the store by key.
	 * @param key - The key to retrieve the value for.
	 * @returns The value associated with the key, or undefined if the key does not exist.
	 */
	get<T extends V = V>(key: K) {
		const store = this.getStore();
		return store ? get(store, key) as T : undefined;
	}

	/**
	 * Sets a value in the store by key.
	 * @param key - The key to set the value for.
	 * @param value - The value to set.
	 */
	set<T extends V = V>(key: K, value: T) {
		const store = this.getStore();
		if (store) {
			set(store, key, value);
		}
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
	 * @experimental depends on {@link AsyncLocalStorage#exit}
	 *
	 * @param fn - The function to run.
	 * @returns The result of the function.
	 */
	exit<T>(fn: () => T) {
		return this.asyncLocalStorage.exit(fn);
	}

	/**
	 * Binds a function to the current store context.
	 * @experimental depends on {@link AsyncLocalStorage#bind}
	 *
	 * @param fn - The function to bind.
	 * @returns The bound function.
	 */
	bind<T extends () => any>(fn: T) {
		return AsyncLocalStorage.bind(fn);
	}

	/**
	 * Enters a new store context with the given default values.
	 * @experimental depends on {@link AsyncLocalStorage#enterWith}
	 *
	 * @param defaults - The default values to initialize the store with.
	 */
	enterWith(defaults?: Dictionary<K, V>) {
		const store = this.createStore(defaults);
		return this.asyncLocalStorage.enterWith(store);
	}
}

export default ALS;
