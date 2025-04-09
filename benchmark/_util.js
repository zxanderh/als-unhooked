import { ALS } from 'als-unhooked';
import legacy from 'als-unhooked/legacy';
import clsHooked from 'cls-hooked';
import _ from 'lodash';
import assert from 'node:assert';
import { inspect } from 'node:util';
// import crypto from 'node:crypto';

// cls-hooked may throw when the last namespace is destroyed. Create a spare one now to prevent this.
// I think this may have something to do with being "called from C++", see
// https://github.com/Jeff-Lewis/cls-hooked/blob/0ff594bf6b2edd6fb046b10b67363c3213e4726c/context.js#L323
clsHooked.createNamespace('foo');

export const pkgNames = ['modern', 'legacy', 'clsHooked'];

const getTargetPkg_regex = new RegExp(pkgNames.join('|'));
export function getTargetPkg() {
	const pkg = process.argv.find(s=>s.startsWith('--pkg'))?.split?.('--pkg=')?.[1];
	if (pkg) {
		assert.match(pkg, getTargetPkg_regex, `Invalid target package "${pkg}". Valid options: ${inspect(pkgNames)}`);
	}
	return pkg;
}

export const nextTick = (cb) => new Promise(r => process.nextTick(() => r(cb())));

export const of = (n, fn) => Array(n).fill(0).map((_, i) => fn(i));

// let i = -1;
// export const random = () => String(++i);
export const random = () => String(Math.random());
// export const random = () => crypto.randomUUID();

export function shuffle(array) {
	let currentIndex = array.length;

	// While there remain elements to shuffle...
	while (currentIndex !== 0) {

		// Pick a remaining element...
		const randomIndex = Math.floor(Math.random() * currentIndex);
		currentIndex--;

		// And swap it with the current element.
		[array[currentIndex], array[randomIndex]] = [
			array[randomIndex], array[currentIndex]];
	}
	return array;
}

export function pruneStats(allStats) {
	return _.mapValues(allStats, (stats) => _.isObject(stats) ? _.omit(stats, ['debug', 'samples']) : stats);
}

export function leftPad(s, n) {
	s = String(s);
	// eslint-disable-next-line no-control-regex
	const clean = s.replaceAll(/\x1b(\[\d+m)+/g, '');
	if (n > clean.length) {
		return ' '.repeat(n - clean.length) + s;
	}
	return s;
}

export const optionsDefaults = {
	batch_samples: 5 * 1024,
	warmup_samples: 2 * 1024,
	min_cpu_time: 1000 * 1e6,
	inner_gc: true,
};

const namespaces = process['alsRetro@namespaces'] ||= new Map();

export class ALSRetro extends ALS {
	static createNamespace(name) {
		const ns = new this(name);
		namespaces.set(name, ns);
		return ns;
	}
	static getNamespace(name) {
		return namespaces.get(name);
	}
	static destroyNamespace(name) {
		let ns;
		// eslint-disable-next-line no-cond-assign
		if (ns = namespaces.get(name)) {
			ns.disable();
			namespaces.delete(name);
		}
	}
	static reset() {
		namespaces.keys().forEach(ALSRetro.destroyNamespace);
	}
	constructor(name) {
		super();
		this.name = name;
	}
}

export const pkgs = {
	clsHooked,
	legacy,
	modern: ALSRetro,
};
