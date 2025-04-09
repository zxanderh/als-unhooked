'use strict';
import { measure, $ } from 'mitata';
import _ from 'lodash';
import { getTargetPkg, optionsDefaults, pkgs, random } from './_util.js';
import chalk from 'chalk';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';

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
				cls.createNamespace(name);
				const ns = cls.getNamespace(name);
				ns.run(() => {
					ns.set(key, value);
					process.nextTick(() => {
						ns.get(key);
						cls.destroyNamespace(name);
						resolve();
					});
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
