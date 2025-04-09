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
	const name = random();
	cls.createNamespace(name);
	yield {
		[0]() { return cls.getNamespace(name); },

		bench(ns) {
			ns.run(() => {});
		},
	};
}, options);

if (isMainThread) {
	console.log(options.args.pkg, chalk.yellowBright($.time(stats.avg)));
} else {
	parentPort.postMessage({ pkg: options.args.pkg, stats });
}
