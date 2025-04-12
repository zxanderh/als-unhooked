import fs from 'node:fs';
import _ from 'lodash';
import { $ } from 'mitata';
import { leftPad, pkgNames, shuffle } from './_util.js';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import { dirname } from 'node:path';
import { Worker } from 'node:worker_threads';
import os from 'node:os';

// get file names, skipping ones starting with "_"
const files = fs.readdirSync(dirname(fileURLToPath(import.meta.url))).filter(s => s[0] !== '_');
// determine width of first column
const col1Width = Math.max(16, _(files).map('length').max()) + 2;

// convenience wrapper around mitata's time fn that allows for blank values
const time = (v) => typeof v === 'number' ? $.time(v) : (v || '');

// writes newline to stdout
const newLine = () => process.stdout.write('\n');

/**
 * Writes values to the correct line based on file name.
 * This maintains the order of results between runs for easier comparison.
 */
function lineOut(vals, name = '') {
	const lineNumber = files.indexOf(name);	// header line is -1
	const text = [ name ? name.padStart(col1Width) : '', ...vals.map(v => leftPad(v, 15))].join('  ');
	process.stdout.moveCursor(0, lineNumber);
	process.stdout.write(text);
	process.stdout.moveCursor(-text.length, -lineNumber);
}

// add blank line for readability (unless run from an npm script, since npm does that for us)
if (!process.env.npm_lifecycle_event) {
	newLine();
}
newLine();	// line for headers
files.forEach(() => newLine());	// lines for results
process.stdout.moveCursor(0, -files.length);	// move back to 0,0
lineOut(pkgNames, ' ');	// write headers (line no. -1)

/** Formats the results of a set of benches and writes them with {@link lineOut} */
function writeResult(trial, benchName) {
	const avgs = pkgNames.map(s => trial.runs.find(r => r.name === s)?.stats?.avg);
	const sorted = _.sortBy(avgs);
	const colors = ['greenBright', 'yellowBright', 'redBright'];
	const styled = avgs.map(v => chalk[colors[sorted.indexOf(v)]](time(v)));
	lineOut(styled, benchName);
}

const allProms = [];
const throttle = process.argv.includes('--throttle');	// run benches one-at-a-time

/**
 * A very basic worker pool. Implementing our own is preferable since control over execution
 * is vital to achieving consistent results between runs.
 */
const pool = new class {
	constructor() {
		this.tasks = [];
		this.slots = Array(Math.max(os.availableParallelism() - 1, 1)).fill({});
	}
	add(task) {
		this.tasks.push(task);
		this.#next();
	}
	#next() {
		if (this.tasks.length && this.slots.length) {
			const slot = this.slots.pop();
			const task = this.tasks.shift();
			if (slot && task) {
				const worker = task.createWorker();
				worker.on('exit', () => {
					this.slots.push(slot);
					this.#next();
				});
			} else {
				if (slot) {
					this.slots.push(slot);
				} else if (task) {
					this.tasks.push(task);
				}
			}
		}
	}
}();

/** Tasks are just a place to store Worker data while it waits in the queue. */
class Task {
	constructor(filePath, options) {
		this.filePath = filePath;
		this.options = options;
		this.callbacks = {};
	}
	on(evt, cb) {
		this.callbacks[evt] = cb;
	}
	createWorker() {
		const worker = new Worker(this.filePath, this.options);
		Object.entries(this.callbacks).forEach(([evt, cb]) => worker.on(evt, cb));
		return worker;
	}
}

// shuffle file names to guard against execution-order-bias
for (const fileName of shuffle([...files])) {
	const filePath = new URL(fileName, import.meta.url);

	// shuffle package names to guard against execution-order-bias
	const pNames = shuffle([...pkgNames]);

	const proms = [];
	for (const pkgName of pNames) {
		const prom = new Promise((resolve, reject) => {
			// create task for each pkg and add to queue
			const task = new Task(filePath, {
				workerData: {
					args: { pkg: pkgName },
					// the "run" benches need more samples to get consistent results
					batch_samples: fileName.startsWith('run') ? 1e6 : 10 * 1024,
					warmup_samples: 5 * 1024,
					min_cpu_time: 1000 * 1e6,
					inner_gc: true,
				},
			});
			task.on('message', resolve);
			task.on('error', reject);
			task.on('exit', (code) => {
				if (code !== 0)
				{reject(new Error(`Worker stopped with exit code ${code}`));}
			});
			pool.add(task);
		}).then(({ stats, pkg }) => {
			return { fileName, name: pkg, stats };
		});

		proms.push(prom);
	}

	// after all instances of this benchmark have finished, write result
	const combined = Promise.all(proms).then((results) => {
		const mapped = { trial: { runs: results }, fileName };
		writeResult(mapped.trial, fileName);
		return mapped;
	});
	allProms.push(combined);

	// if throttled, wait for this set of benches before continuing
	if (throttle) {
		await combined;
	}
}

// wait for all benchmarks to finish
await Promise.all(allProms);

process.stdout.moveCursor(0, files.length);
newLine();
