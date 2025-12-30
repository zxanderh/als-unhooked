import type { EventEmitter } from 'node:events';
import type { Debugger } from 'debug';

// This needs to be in a cjs file so we can use require, since top-level await
// can cause problems starting in Node 24. This has the bonus benefit of
// simplifying the build process.

/**
 * @description Attempt to import optional dependency 'emitter-listener'
 */
export = function getWrapEmitter(d: Debugger) {
	let wrapEmitter: (emitter: EventEmitter, onAddListener: (fn: Function) => void, onEmit: (fn: Function) => void) => void;
	try {
		wrapEmitter = require('emitter-listener');
		d('emitter-listener loaded');
		return wrapEmitter;
		/* c8 ignore start */
	} catch {
		// ToDo find a way to get test coverage of these lines (maybe test in an isolated fixture?)
		d('emitter-listener NOT loaded');
		return undefined;
	}
	/* c8 ignore stop */
}
