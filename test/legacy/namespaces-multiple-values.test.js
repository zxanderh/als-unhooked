'use strict';

import 'mocha';
import * as chai from 'chai';
import util from 'util';
chai.should();

import cls from '../../legacy.js';

describe('multiple namespaces handles them correctly', function() {

	let test1Val;
	let test2Val;
	let test3Val;
	let test4Val;

	const ns1 = cls.createNamespace('ONE');
	const ns2 = cls.createNamespace('TWO');


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

					});

				});

			});
		});

	});

	it('name tom1', function() {
		test1Val.should.equal('tom1');
	});

	it('name paul2', function() {
		test2Val.should.equal('paul2');
	});

	it('name bob', function() {
		test3Val.should.equal('bob');
	});

	it('name alice', function() {
		test4Val.should.equal('alice');
	});

});

