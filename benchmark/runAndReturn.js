'use strict';
import { measure, $ } from 'mitata';
import _ from 'lodash';
import { getTargetPkg, optionsDefaults, pkgs, random } from './_util.js';
import chalk from 'chalk';
import { isMainThread, parentPort, workerData } from 'node:worker_threads';

const options = workerData || { args: { pkg: getTargetPkg() || 'modern' } };
_.defaults(options, { batch_samples: 1e5 }, optionsDefaults);

const stats = await measure(async function* (state) {
	const cls = pkgs[state.get('pkg')];
	const name = random();
	cls.createNamespace(name);
	yield {
		[0]() { return cls.getNamespace(name); },

		async bench(ns) {
			await new Promise((resolve) => ns.runAndReturn(resolve));
		},
	};
}, options);

if (isMainThread) {
	console.log(options.args.pkg, chalk.yellowBright($.time(stats.avg)));
} else {
	parentPort.postMessage({ pkg: options.args.pkg, stats });
}
