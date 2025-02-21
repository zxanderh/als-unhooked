'use strict';

import { expect } from 'chai';
import net from 'net';
import { ALS } from '../index.js';

describe('cls with net connection 2', function() {

	const DATUM1 = 'Hello';
	const DATUM2 = 'GoodBye';
	const TEST_VALUE = 0x1337;
	const TEST_VALUE2 = 'MONKEY';
	const keyName = 'netTest2';
	let server;

	after(function() {
		server?.close?.();
	});

	it('client server', function(done) {
		const namespace = new ALS();

		namespace.run(function namespaceRun1() {
			namespace.set(keyName, TEST_VALUE);
			server = net.createServer();

			server.on('connection', function OnServerConnection(socket) {
				expect(namespace.get(keyName)).equal(TEST_VALUE, 'state has been mutated');

				socket.on('data', namespace.bind(function OnServerSocketData(data) {
					data = data.toString('utf-8');
					expect(data).equal(DATUM1, 'should get DATUM1');
					expect(namespace.get(keyName)).equal(TEST_VALUE, 'state is still preserved');

					socket.end(DATUM2);
					server.close();
				}));
			});

			server.listen(function onServerListen() {
				namespace.run(
					function namespaceRun2() {
						namespace.set(keyName, TEST_VALUE2);

						const port = server.address().port;
						const client = net.connect(port, function OnClientConnect() {
							expect(namespace.get(keyName)).equal(TEST_VALUE2, 'state preserved for client connection');
							client.on('data', function OnClientSocketData(data) {
								data = data.toString('utf-8');
								expect(data).equal(DATUM2, 'should get DATUM1');
								expect(namespace.get(keyName)).equal(TEST_VALUE2, 'state preserved for client data');
							});

							client.on('close', function onClientSocketClose() {
								done();
							});

							client.write(DATUM1);
						});
					},
				);
			});
		});
	});
});
