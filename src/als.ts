import { AsyncLocalStorage } from 'async_hooks';
import debug from 'debug';
const d = debug('als:ALS');
// ToDo: debugging

export class ALS<K = any, V = any> {
	asyncLocalStorage: AsyncLocalStorage<Map<K, V>>;
	constructor() {
		d('constructor');
		this.asyncLocalStorage = new AsyncLocalStorage();
	}

	getStore() {
		return this.asyncLocalStorage.getStore();
	}
	get<T extends V = V>(key: K) {
		const store = this.getStore();
		return store ? store.get(key) as T : undefined;
	}
	set<T extends V = V>(key: K, value: T) {
		const store = this.getStore();
		if (store) {
			store.set(key, value);
		}
	}
	run<T>(fn: () => T, defaults: Obj<V> | MapLike<K, V>) {
		const store = new Map(entries(defaults));
		return this.asyncLocalStorage.run(store, fn);
	}
	/** @experimental */
	exit<T>(fn: () => T) {
		return this.asyncLocalStorage.exit(fn);
	}
	/** @experimental */
	bind<T extends () => any>(fn: T) {
		return AsyncLocalStorage.bind(fn);
	}
	/** @experimental */
	enterWith(defaults: Obj<V> | MapLike<K, V>) {
		const store = new Map(entries(defaults));
		return this.asyncLocalStorage.enterWith(store);
	}
}

type Obj<T> = Record<PropertyKey, T>;
interface MapLike<K, V> {
	entries(): Iterable<[K, V]>;
};

function isMapLike(x: any): x is MapLike<unknown, unknown> {
	return typeof x?.entries === 'function';
}
function entries<K, V>(obj: Obj<V> | MapLike<K, V>) {
	return !obj
		? []
		: isMapLike(obj)
			? obj.entries()
			: [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)].map((k) => [k, obj[k]] as [K, V])
	;
}

export default ALS;
