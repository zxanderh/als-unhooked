
export interface MapLike<K, V> {
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
	return typeof x?.entries === 'function' && typeof x?.get === 'function' && typeof x?.set === 'function';
}

/** @private */
export function entries<K, V>(obj?: Dictionary<K, V>) {
	return !obj
		? []
		: isMapLike(obj)
			? obj.entries()
			: [...Object.keys(obj), ...Object.getOwnPropertySymbols(obj)].map((k) => [k, obj[k]] as [K, V])
	;
}

/** @private */
export function get<V, K>(obj: Dictionary<K, V>, key: K) {
	return isMapLike(obj) ? obj.get(key) : obj[key as PropertyKey] as V;
}

/** @private */
export function set<V, K>(obj: Dictionary<K, V>, key: K, value: V) {
	isMapLike(obj) ? obj.set(key, value) : obj[key as PropertyKey] = value;
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
