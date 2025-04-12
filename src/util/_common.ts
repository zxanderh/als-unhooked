
export interface MapLike<K, V> {
	[Symbol.iterator](): Iterator<[K, V]>;
	entries(): Iterable<[K, V]>;
	get(k: K): V;
	set(k: K, v: V): void;
};

/**
 * Represents either a normal javascript object or one implementing a {@link MapLike} interface
 */
export type Dictionary<K, V> = (K extends PropertyKey ? Record<K, V> : never) | Map<K, V> | MapLike<K, V>;

/** @private */
export function isMapLike(x: any): x is MapLike<unknown, unknown> {
	return x && x.get && x.set;//  && x[Symbol.iterator];
}

function isMapLike_get(x: any): x is MapLike<unknown, unknown> {
	return x && x.get && typeof x.get === 'function';
}

function isMapLike_set(x: any): x is MapLike<unknown, unknown> {
	return x && x.set && typeof x.set === 'function';
}

function isMapLike_entries(x: any): x is MapLike<unknown, unknown> {
	return x && x.entries && typeof x.entries === 'function';
}

/** @private */
export function entries<K, V>(obj?: Dictionary<K, V>) {
	return !obj
		? []
		: isMapLike_entries(obj)
			? obj.entries()
			: [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)].map((k) => [k, obj[k]] as [K, V])
	;
}

/** @private */
export function get<V, K>(obj: Dictionary<K, V>, key: K) {
	return isMapLike_get(obj) ? obj.get(key) : obj[key as PropertyKey] as V;
}

/** @private */
export function set<V, K>(obj: Dictionary<K, V>, key: K, value: V) {
	isMapLike_set(obj) ? obj.set(key, value) : (obj[key as PropertyKey] = value);
}

/** @private */
export function generateCodename() {
	const adjectives = ['swift', 'bold', 'silent', 'rapid', 'bright', 'calm', 'gentle', 'strong', 'clever', 'eager'];
	const nouns = ['tiger', 'falcon', 'shadow', 'rocket', 'star', 'river', 'wind', 'giant', 'thinker', 'explorer'];

	const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
	const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

	return `${randomAdjective}_${randomNoun}`;
}

/** @private */
export function noop(..._rgs: any[]) {}
