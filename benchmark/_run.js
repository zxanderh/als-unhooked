import fs from 'node:fs';
import _ from 'lodash';
import { $ } from 'mitata';
import { leftPad, pkgNames, shuffle } from './_util.js';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname } from 'node:path';
import { Worker } from 'node:worker_threads';

const files = fs.readdirSync(dirname(fileURLToPath(import.meta.url))).filter(s => s[0] !== '_');
const col1Width = Math.max(16, _(files).map('length').max()) + 2;

const time = (v) => typeof v === 'number' ? $.time(v) : (v || '');

function lineOut(vals, name = '') {
	process.stdout.write([ name ? name.padStart(col1Width) : '', ...vals.map(v => leftPad(v, 15))].join('  ')+'\n');
}
console.log('');
lineOut(pkgNames, ' ');

/** @param {import('mitata').trial} */
function writeResult(trial, benchName) {
	const avgs = pkgNames.map(s => trial.runs.find(r => r.name === s)?.stats?.avg);
	const sorted = _.sortBy(avgs);
	const colors = ['greenBright', 'yellowBright', 'redBright'];
	const styled = avgs.map(v => chalk[colors[sorted.indexOf(v)]](time(v)));
	lineOut(styled, benchName);
}

const allProms = [];
const throttle = process.argv.includes('--throttle');

for (const fileName of files) {
	const filePath = new URL(fileName, import.meta.url);

	const pNames = [...pkgNames];
	shuffle(pNames);

	const proms = [];
	for (const pkgName of pNames) {
		const prom = new Promise((resolve, reject) => {
			const worker = new Worker(filePath, {
				workerData: {
					args: { pkg: pkgName },
					batch_samples: 10 * 1024,
					warmup_samples: 5 * 1024,
					min_cpu_time: 2000 * 1e6,
					inner_gc: true,
				},
			});
			worker.on('message', resolve);
			worker.on('error', reject);
			worker.on('exit', (code) => {
				if (code !== 0)
				{reject(new Error(`Worker stopped with exit code ${code}`));}
			});
		}).then(({ stats }) => {
			return { fileName, name: pkgName, stats };
		});

		proms.push(prom);
	}

	const combined = Promise.all(proms).then((results) => {
		return { trial: { runs: results }, fileName };
	});
	allProms.push(combined);
	if (throttle) {
		await combined;
	}
}

await Promise.all(allProms).then(r => r.forEach(({ trial, fileName }) => writeResult(trial, fileName)));

