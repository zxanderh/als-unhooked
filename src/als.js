import { AsyncLocalStorage } from 'async_hooks';
import debug from 'debug';
const d = debug('als:ALS');
// ToDo: debugging

function entries(obj) {
	return !obj ? [] : obj.entries ? obj.entries() : Object.entries(obj);
}

export class ALS {
	constructor() {
		d('constructor');
		this.asyncLocalStorage = new AsyncLocalStorage();
	}

	getStore() {
		return this.asyncLocalStorage.getStore();
	}
	get(key) {
		const store = this.getStore();
		return store ? store.get(key) : undefined;
	}
	set(key, value) {
		const store = this.getStore();
		if (store) {
			store.set(key, value);
		}
	}
	run(fn, defaults) {
		const store = defaults ? new Map(entries(defaults)) : new Map();
		return this.asyncLocalStorage.run(store, fn);
	}
	/** @experimental */
	exit(fn) {
		return this.asyncLocalStorage.exit(fn);
	}
	/** @experimental */
	bind(fn) {
		return AsyncLocalStorage.bind(fn);
	}
	/** @experimental */
	enterWith(defaults) {
		const store = defaults ? new Map(entries(defaults)) : new Map();
		return this.asyncLocalStorage.enterWith(store);
	}
}

export default ALS;
