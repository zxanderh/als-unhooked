
export type Obj<T> = Record<PropertyKey, T>;

export interface MapLike<K, V> {
	entries(): Iterable<[K, V]>;
	get(k: K): V;
	set(k: K, v: V): void;
};

export type Dictionary<K, V> = (K extends PropertyKey ? Record<K, V> : never) | Map<K, V> | MapLike<K, V>;

export function isMapLike(x: any): x is MapLike<unknown, unknown> {
	return typeof x?.entries === 'function' && typeof x?.get === 'function' && typeof x?.set === 'function';
}

export function entries<K, V>(obj?: Dictionary<K, V>) {
	return !obj
		? []
		: isMapLike(obj)
			? obj.entries()
			: [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)].map((k) => [k, obj[k]] as [K, V])
	;
}

export function get<V, K>(obj: Dictionary<K, V>, key: K) {
	return isMapLike(obj) ? obj.get(key) : obj[key as PropertyKey];
}

export function set<V, K>(obj: Dictionary<K, V>, key: K, value: V) {
	isMapLike(obj) ? obj.set(key, value) : obj[key as PropertyKey] = value;
}
