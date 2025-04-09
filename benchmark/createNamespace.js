'use strict';
import { measure, $ } from 'mitata';
import _ from 'lodash';
import { getTargetPkg, optionsDefaults, pkgs, random } from './_util.js';
import chalk from 'chalk';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';

const options = workerData || { args: { pkg: getTargetPkg() || 'modern' } };
_.defaults(options, optionsDefaults);
const $cls = pkgs[options.args.pkg];

const stats = await measure(function* (state) {
	const cls = pkgs[state.get('pkg')];
	yield {
		[0]() { return random(); },

		bench(name) {
			cls.createNamespace(name);
		},
	};
}, {
	...options,
	inner_gc: true,
	gc: () => {
		$cls.reset();
		globalThis.gc();
	},
});

if (isMainThread) {
	console.log(options.args.pkg, chalk.yellowBright($.time(stats.avg)));
} else {
	parentPort.postMessage({ pkg: options.args.pkg, stats });
}
