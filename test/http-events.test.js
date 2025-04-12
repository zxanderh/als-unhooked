'use strict';

const DATUM1 = 'Hello';
const DATUM2 = 'GoodBye';
const TEST_VALUE = 0x1337;
const PORT = 55667;

import * as chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import http from 'http';
import ALS from 'als-unhooked/modern';
chai.should();
chai.use(sinonChai);

describe('cls with http connections', function() {

	this.timeout(1000);

	describe('client server', function clientServerTest() {

		var namespace = new ALS();

		var requestSpy = sinon.spy();
		var requestDataSpy = sinon.spy();
		var responseSpy = sinon.spy();
		var responseDataSpy = sinon.spy();
		var finalContextValue;
		var server;

		before(function(done) {

			namespace.run(() => {
				namespace.set('test', TEST_VALUE);
				server = http.createServer();

				server.on('request', function OnServerConnection(req, res) {
					requestSpy(namespace.get('test'));

					req.on('data', function OnServerSocketData(data) {
						requestDataSpy(data.toString('utf-8'), namespace.get('test'));
						server.close();
						res.end(DATUM2);
					});
				});

				server.listen(PORT, function OnServerListen() {

					namespace.run(() => {

						namespace.set('test', 'MONKEY');

						var request = http.request({host: 'localhost', port: PORT, method: 'POST'}, function OnClientConnect(res) {

							responseSpy(namespace.get('test'));

							res.on('data', function OnClientSocketData(reponseData) {
								responseDataSpy(reponseData.toString('utf-8'), namespace.get('test'));
								done();
							});
						});

						request.write(DATUM1);
					});

				});

				finalContextValue = namespace.get('test');
			});


		});

		after(function() {
			server.closeAllConnections();
		});

		it('server request event should be called', function() {
			requestSpy.called.should.be.true;
		});

		it('server request event should receive data', function() {
			requestSpy.should.have.been.calledWith(TEST_VALUE);
		});

		it('server request data event should be called', function() {
			requestDataSpy.called.should.be.true;
		});

		it('server request data event should receive data', function() {
			requestDataSpy.should.have.been.calledWith(DATUM1, TEST_VALUE);
		});

		it('client data event should be called', function() {
			responseSpy.called.should.be.true;
		});

		it('client data event should receive data', function() {
			responseDataSpy.should.have.been.calledWith(DATUM2, 'MONKEY');
		});

		it('final context value should be ' + TEST_VALUE, function() {
			finalContextValue.should.be.equal(TEST_VALUE);
		});

	});
});
