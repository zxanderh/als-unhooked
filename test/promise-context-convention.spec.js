'use strict';

import 'mocha';
import * as chai from 'chai';
const should = chai.should();

import { ALS } from '../index.js';

/**
 * See https://github.com/othiym23/node-continuation-local-storage/issues/64
 */
describe('Promise context convention', () => {

	let promise;
	const ns = new ALS();
	let conventionId = 0;

	before((done) => {
		ns.run(() => {
			ns.set('test', 2);
			promise = new Promise((resolve) => {
				ns.run(() => {
					ns.set('test', 1);
					resolve();
				});
			});
		});

		ns.run(() => {
			ns.set('test', 3);
			promise.then(() => {
				// console.log('This Promise implementation follows convention ' + ns.get('test'));
				conventionId = ns.get('test');
				done();
			});
		});

	});

	it('convention should be 3', () => {
		should.equal(conventionId, 3);
	});

});
