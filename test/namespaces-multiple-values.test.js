'use strict';

import 'mocha';
import { expect } from 'chai';
import util from 'util';

import ALS from 'als-unhooked/modern';

describe('multiple namespaces handles them correctly', function() {

	let test1Val;
	let test2Val;
	let test3Val;
	let test4Val;

	const ns1 = new ALS();
	const ns2 = new ALS();


	before(function(done) {

		ns1.run(() => {
			ns2.run(() => {

				ns1.set('name', 'tom1');
				ns2.set('name', 'paul2');

				setTimeout(() => {

					ns1.run(() => {

						process.nextTick(() => {

							test1Val = ns1.get('name');
							process._rawDebug(util.inspect(ns1), true);

							test2Val = ns2.get('name');
							process._rawDebug(util.inspect(ns2), true);

							ns1.set('name', 'bob');
							ns2.set('name', 'alice');

							setTimeout(function() {
								test3Val = ns1.get('name');
								test4Val = ns2.get('name');
								done();
							});

						});

					}, ns1.getStore());

				});

			});
		});

	});

	it('name tom1', function() {
		expect(test1Val).to.equal('tom1');
	});

	it('name paul2', function() {
		expect(test2Val).to.equal('paul2');
	});

	it('name bob', function() {
		expect(test3Val).to.equal('bob');
	});

	it('name alice', function() {
		expect(test4Val).to.equal('alice');
	});

});

