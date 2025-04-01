import { AsyncLocalStorage } from 'node:async_hooks';
import { Dictionary, get, set } from './_common.js';

/**
 * @protected
 * A base class from which the modern and legacy APIs are both derived.
 */
export abstract class ALSBase<K, V, S extends Dictionary<K, V>> {
	protected asyncLocalStorage: AsyncLocalStorage<S>;

	constructor() {
		this.asyncLocalStorage = new AsyncLocalStorage();
	}

	protected abstract createStore(defaults?: Dictionary<K, V>): S;

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
	 * Binds a function to the current store context.
	 * Marked experimental as it depends on {@link AsyncLocalStorage.bind}
	 * @experimental
	 * @param fn - The function to bind.
	 * @returns The bound function.
	 */
	bind<T extends () => any>(fn: T) {
		return AsyncLocalStorage.bind(fn);
	}

	/**
	 * Enters a new store context with the given default values.
	 * Marked experimental as it depends on {@link AsyncLocalStorage#enterWith}
	 * @experimental
	 * @param defaults - The default values to initialize the store with.
	 */
	protected enterWith(defaults?: Dictionary<K, V>) {
		const store = this.createStore(defaults);
		return this.asyncLocalStorage.enterWith(store);
	}
}
