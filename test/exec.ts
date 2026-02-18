import * as fs from 'node:fs';
import * as path from 'node:path';
import * as cp from 'node:child_process';
import _ from 'lodash';
import { packageDirectorySync } from 'package-directory';

const root = packageDirectorySync();
if (!root) {
	throw new Error('Unable to locate project root!');
}

// setup shorthand run() fn
const run = (cmd: string) => cp.execSync(cmd, { cwd: root, stdio: 'inherit' });

// test esm
run('npm run test:unit');
run('npm run test:intr');

let packageJsonRaw = '';
let packageJsonPath = '';
try {
	// read package.json
	packageJsonPath = path.join(root, 'package.json');
	packageJsonRaw = fs.readFileSync(packageJsonPath, 'utf-8');

	// change package.json to commonjs
	const pkg = _.merge(JSON.parse(packageJsonRaw), { type: 'commonjs' });
	fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, '\t'));

	// test cjs
	// ignoring coverage because ts generates additional stuff for cjs, and we already tested coverage for esm
	run('npm run test:unit:tap --- --disable-coverage --allow-empty-coverage');
} finally {
	// change package.json back to esm
	if (packageJsonRaw) {
		fs.writeFileSync(packageJsonPath, packageJsonRaw);
	}
}
