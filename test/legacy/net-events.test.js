'use strict';

import 'mocha';
import { expect } from 'chai';
import net from 'net';
import cls from 'als-unhooked/legacy';

describe('cls with net connection', function() {

	let namespace;
	let testValue1;
	let testValue2;
	let testValue3;
	let testValue4;

	before(function(done) {
		namespace = cls.createNamespace('net');

		let serverDone = false;
		let clientDone = false;

		namespace.run(() => {
			namespace.set('test', 'originalValue');

			let server;
			namespace.run(() => {
				namespace.set('test', 'newContextValue');

				server = net.createServer(namespace.bind((socket) => {
					testValue1 = namespace.get('test');
					namespace.bindEmitter(socket);

					socket.on('data', () => {
						testValue2 = namespace.get('test');
						server.close();
						socket.end('GoodBye');

						serverDone = true;
						checkDone();
					});

				}));

				server.listen(() => {
					const address = server.address();
					namespace.run(() => {
						namespace.set('test', 'MONKEY');

						const client = net.connect(address.port, () => {
							// namespace.bindEmitter(client);
							testValue3 = namespace.get('test');
							client.write('Hello');

							client.on('data', () => {
								testValue4 = namespace.get('test');
								clientDone = true;
								checkDone();
							});

						});
					});
				});
			});
		});

		function checkDone() {
			if (serverDone && clientDone) {
				done();
			}
		}

	});

	it('value newContextValue', function() {
		expect(testValue1).to.equal('newContextValue');
	});

	it('value newContextValue 2', function() {
		expect(testValue2).to.equal('newContextValue');
	});

	it('value MONKEY', function() {
		expect(testValue3).to.equal('MONKEY');
	});

	it('value MONKEY 2', function() {
		expect(testValue4).to.equal('MONKEY');
	});

});
