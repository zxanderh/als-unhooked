'use strict';
import { measure, $ } from 'mitata';
import _ from 'lodash';
import { getTargetPkg, of, optionsDefaults, pkgs, random } from './_util.js';
import chalk from 'chalk';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';

function runStores(stores, cb, idx = 0) {
	if (idx === stores.length) {
		return cb();
	} else {
		return stores[idx].run(() => {
			return runStores(stores, cb, idx + 1);
		});
	}
}

const options = workerData || { args: { pkg: getTargetPkg() || 'modern' } };
_.defaults(options, optionsDefaults);

const stats = await measure(function* (state) {
	const cls = pkgs[state.get('pkg')];
	yield {
		[0]() { return random(); },
		[1]() { return random(); },
		[2]() { return random(); },

		bench(name, key, value) {
			return new Promise((resolve) => {
				const stores = of(5, (i) => cls.createNamespace(name + i));
				runStores(stores, () => {
					stores[0].set(key, value);
					stores[0].get(key);
					stores.forEach((_, i) => cls.destroyNamespace(name + i));
					resolve();
				});
			});
		},
	};
}, options);

if (isMainThread) {
	console.log(options.args.pkg, chalk.yellowBright($.time(stats.avg)));
} else {
	parentPort.postMessage({ pkg: options.args.pkg, stats });
}
