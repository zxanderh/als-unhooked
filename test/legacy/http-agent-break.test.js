'use strict';

import * as chai from 'chai';
const should = chai.should();

import superagent from 'superagent';

import cls from '../../legacy.js';
import http from 'http';

const keepAlive = process.env.KEEP_ALIVE !== '0';

describe('cls with http Agent', function() {

	let httpAgent;
	const namespace = cls.createNamespace('httpAgent');

	before(function() {
		httpAgent = new http.Agent({
			keepAlive: keepAlive,
			maxSockets: 1,
			keepAliveMsecs: 30000,
		});
	});


	describe('when making two http requests', function() {

		let innerRequestContextValue;

		it('should retain context during first', function(done) {
			doClsAction(123, () => {
				should.exist(innerRequestContextValue);
				innerRequestContextValue.should.equal(123);
				done();
			});
		});


		it('should retain context during second', function(done) {
			doClsAction(456, () => {
				should.exist(innerRequestContextValue);
				innerRequestContextValue.should.equal(456);
				done();
			});
		});


		function doClsAction(id, cb) {
			namespace.run(function() {
				// var xid = Math.floor(Math.random() * 1000);
				var xid = id;
				namespace.set('xid', xid);
				// process._rawDebug('before calling httpGetRequest: xid value', namespace.get('xid'));

				httpGetRequest(function(e) {
					// process._rawDebug('returned from action xid value', namespace.get('xid'), 'expected', xid);
					innerRequestContextValue = namespace.get('xid');
					// assert.equal(namespace.get('xid'), xid);
					cb(e);
				});

			});
		}


		function httpGetRequest(cb) {

			// https://github.com/othiym23/node-continuation-local-storage/issues/71
			// namespace.bindEmitter(superagent.Request.super_.prototype);

			var req = superagent['get']('http://www.google.com');

			if (keepAlive) {
				// process._rawDebug('Keep alive ENABLED, setting http agent');
				req.agent(httpAgent);
			}

			req.end(function(err, res) {
				if (err) {
					cb(err);
				} else {
					// process._rawDebug('http get status', res.status);
					cb(null, {status: res.status, statusText: res.text, obj: res.body});
				}
			});
		}

	});

});
