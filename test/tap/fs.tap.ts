'use strict';

import os from 'os';
import { createNamespace } from 'als-unhooked/legacy';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { test } from 'tap';

const tmp = (f) => path.join(TEMP, Array.isArray(f) ? f[0] : f);

// CONSTANTS
const TEMP = os.tmpdir();
// const FILENAME = tmp`__testfile`;
const DIRNAME = tmp`__TESTDIR`;
const LINKNAME = tmp`__testlink`;
const HARDLINKNAME = tmp`__testhardlink`;
const isRoot = process.getuid?.() === 0;

function getFileName() {
	return tmp(Math.random().toString(16).slice(2));
}

function createFile(assert) {
	const fileName = getFileName();
	const contents = Buffer.from('UHOH')
		, file = fs.openSync(fileName, 'w')
		, written = fs.writeSync(file, contents, 0, contents.length, 0)
    ;
	assert.equal(written, contents.length, 'whole buffer was written');
	fs.closeSync(file);
	// need this here to avoid dealing with umask complications
	fs.chmodSync(fileName, '0666');
	return fileName;
}

function deleteFile(FILENAME) {
	return fs.unlinkSync(FILENAME);
}


function createLink(assert) {
	const FILENAME = createFile(assert);
	fs.symlinkSync(FILENAME, LINKNAME);
	if (fs.lchmodSync) {
		// This function only exists on BSD systems (like OSX)
		fs.lchmodSync(LINKNAME, '0777');
	}
	return FILENAME;
}

function deleteLink(FILENAME) {
	fs.unlinkSync(LINKNAME);
	return deleteFile(FILENAME);
}


function createDirectory(assert) {
	fs.mkdirSync(DIRNAME);
	assert.ok(fs.existsSync(DIRNAME), 'directory was created');
}

function deleteDirectory() {
	return fs.rmdirSync(DIRNAME);
}


function mapIds(username, groupname, callback) {
	if (!callback) {throw new Error('mapIds requires callback');}
	if (!username) {return callback(new Error('mapIds requires username'));}
	if (!groupname) {return callback(new Error('mapIds requires groupname'));}

	exec('id -u ' + username, function(error, stdout, stderr) {
		if (error) {return callback(error);}
		if (stderr) {return callback(new Error(stderr));}

		const uid = +stdout;
		exec('id -g ' + groupname, function(error, stdout, stderr) {
			if (error) {return callback(error);}
			if (stderr) {return callback(new Error(stderr));}

			const gid = +stdout;
			callback(null, uid, gid);
		});
	});
}

test('continuation-local state with MakeCallback and fs module', function(t) {

	t.plan(33);

	const namespace = createNamespace('fs');
	namespace.run(function() {
		namespace.set('test', 0xabad1dea);

		t.test('fs.rename', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'rename');
				t.equal(namespace.get('test'), 'rename', 'state has been mutated');

				fs.rename(FILENAME, FILENAME+'__renamed', function(error) {
					t.notOk(error, "renaming shouldn't error");

					t.equal(namespace.get('test'), 'rename',
						"mutated state has persisted to fs.rename's callback");

					fs.unlinkSync(FILENAME+'__renamed');
					t.end();
				});
			});
		});

		t.test('fs.truncate', function(t) {
			// truncate -> ftruncate in Node > 0.8.x
			if (!fs.ftruncate) {return t.end();}

			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'truncate');
				t.equal(namespace.get('test'), 'truncate', 'state has been mutated');

				fs.truncate(FILENAME, 0, function(error) {
					t.notOk(error, "truncation shouldn't error");

					const stats = fs.statSync(FILENAME);
					t.equal(stats.size, 0, 'file has been truncated');

					t.equal(namespace.get('test'), 'truncate',
						"mutated state has persisted to fs.truncate's callback");

					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.ftruncate', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'ftruncate');
				t.equal(namespace.get('test'), 'ftruncate', 'state has been mutated');

				const file = fs.openSync(FILENAME, 'w');
				fs.ftruncate(file, 0, function(error) {
					t.notOk(error, "truncation shouldn't error");

					fs.closeSync(file);
					const stats = fs.statSync(FILENAME);
					t.equal(stats.size, 0, 'file has been truncated');

					t.equal(namespace.get('test'), 'ftruncate',
						"mutated state has persisted to fs.ftruncate's callback");

					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.chown', { skip: os.platform() === 'win32' }, function(t) {
			const FILENAME = createFile(t);

			mapIds('daemon', 'daemon', function(error, uid, gid) {
				t.notOk(error, "looking up uid & gid shouldn't error");
				t.ok(uid, 'uid for daemon was found');
				t.ok(gid, 'gid for daemon was found');

				namespace.run(function() {
					namespace.set('test', 'chown');
					t.equal(namespace.get('test'), 'chown', 'state has been mutated');

					fs.chown(FILENAME, uid, gid, function(error) {
						t.ok(isRoot || error, 'changing ownership will error for non-root users');

						t.equal(namespace.get('test'), 'chown',
							"mutated state has persisted to fs.chown's callback");

						deleteFile(FILENAME);
						t.end();
					});
				});
			});
		});

		t.test('fs.fchown', { skip: os.platform() === 'win32' }, function(t) {
			const FILENAME = createFile(t);

			mapIds('daemon', 'daemon', function(error, uid, gid) {
				t.notOk(error, "looking up uid & gid shouldn't error");
				t.ok(uid, 'uid for daemon was found');
				t.ok(gid, 'gid for daemon was found');

				namespace.run(function() {
					namespace.set('test', 'fchown');
					t.equal(namespace.get('test'), 'fchown', 'state has been mutated');

					const file = fs.openSync(FILENAME, 'w');
					fs.fchown(file, uid, gid, function(error) {
						t.ok(isRoot || error, 'changing ownership will error for non-root users');

						t.equal(namespace.get('test'), 'fchown',
							"mutated state has persisted to fs.fchown's callback");

						fs.closeSync(file);
						deleteFile(FILENAME);
						t.end();
					});
				});
			});
		});

		t.test('fs.lchown', { skip: os.platform() === 'win32' }, function(t) {
			if (!fs.lchown) {return t.end();}
			const FILENAME = createLink(t);

			mapIds('daemon', 'daemon', function(error, uid, gid) {
				t.notOk(error, "looking up uid & gid shouldn't error");
				t.ok(uid, 'uid for daemon was found');
				t.ok(gid, 'gid for daemon was found');

				namespace.run(function() {
					namespace.set('test', 'lchown');
					t.equal(namespace.get('test'), 'lchown', 'state has been mutated');

					fs.lchown(LINKNAME, uid, gid, function(error) {
						t.ok(isRoot || error, 'changing ownership will error for non-root users');

						t.equal(namespace.get('test'), 'lchown',
							"mutated state has persisted to fs.lchown's callback");

						deleteLink(FILENAME);
						t.end();
					});
				});
			});
		});

		t.test('fs.chmod', { skip: os.platform() === 'win32' }, function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'chmod');
				t.equal(namespace.get('test'), 'chmod', 'state has been mutated');

				fs.chmod(FILENAME, '0700', function(error) {
					t.notOk(error, "changing mode shouldn't error");

					t.equal(namespace.get('test'), 'chmod',
						"mutated state has persisted to fs.chmod's callback");

					const stats = fs.statSync(FILENAME);
					t.equal(stats.mode.toString(8), '100700', 'extra access bits are stripped');

					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.fchmod', { skip: os.platform() === 'win32' }, function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'fchmod');
				t.equal(namespace.get('test'), 'fchmod', 'state has been mutated');

				const file = fs.openSync(FILENAME, 'w+');
				fs.fchmod(file, '0700', function(error) {
					t.notOk(error, "changing mode shouldn't error");

					t.equal(namespace.get('test'), 'fchmod',
						"mutated state has persisted to fs.fchmod's callback");

					fs.closeSync(file);
					const stats = fs.statSync(FILENAME);
					t.equal(stats.mode.toString(8), '100700', 'extra access bits are stripped');

					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.lchmod', { skip: os.platform() === 'win32' }, function(t) {
			if (!fs.lchmod) {return t.end();}
			const FILENAME = createLink(t);

			namespace.run(function() {
				namespace.set('test', 'lchmod');
				t.equal(namespace.get('test'), 'lchmod', 'state has been mutated');

				fs.lchmod(LINKNAME, '0700', function(error) {
					t.notOk(error, "changing mode shouldn't error");

					t.equal(namespace.get('test'), 'lchmod',
						"mutated state has persisted to fs.lchmod's callback");

					const stats = fs.lstatSync(LINKNAME);
					t.equal(stats.mode.toString(8), '120700', 'extra access bits are stripped');

					deleteLink(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.stat', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'stat');
				t.equal(namespace.get('test'), 'stat', 'state has been mutated');

				fs.stat(FILENAME, function(error, stats) {
					t.notOk(error, "reading stats shouldn't error");

					t.equal(namespace.get('test'), 'stat',
						"mutated state has persisted to fs.stat's callback");

					t.equal(stats.mode.toString(8), '100666', 'permissions should be as created');

					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.fstat', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'fstat');
				t.equal(namespace.get('test'), 'fstat', 'state has been mutated');

				const file = fs.openSync(FILENAME, 'r');
				fs.fstat(file, function(error, stats) {
					t.notOk(error, "reading stats shouldn't error");

					t.equal(namespace.get('test'), 'fstat',
						"mutated state has persisted to fs.fstat's callback");

					t.equal(stats.mode.toString(8), '100666', 'permissions should be as created');

					fs.closeSync(file);
					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.lstat', { skip: os.platform() === 'win32' }, function(t) {
			const FILENAME = createLink(t);

			namespace.run(function() {
				namespace.set('test', 'lstat');
				t.equal(namespace.get('test'), 'lstat', 'state has been mutated');

				fs.lstat(LINKNAME, function(error, stats) {
					t.notOk(error, "reading stats shouldn't error");

					t.equal(namespace.get('test'), 'lstat',
						"mutated state has persisted to fs.lstat's callback");

					t.equal(
						stats.mode.toString(8),
						'120777',
						'permissions should be as created',
					);

					deleteLink(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.link', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'link');
				t.equal(namespace.get('test'), 'link', 'state has been mutated');

				fs.link(FILENAME, HARDLINKNAME, function(error) {
					t.notOk(error, "creating a link shouldn't error");

					t.equal(namespace.get('test'), 'link',
						"mutated state has persisted to fs.link's callback");

					const orig = fs.statSync(FILENAME)
						, linked = fs.statSync(HARDLINKNAME)
            ;
					t.equal(orig.ino, linked.ino, 'entries should point to same file');

					t.notOk(fs.unlinkSync(HARDLINKNAME), 'link has been removed');
					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.symlink', { skip: os.platform() === 'win32' }, function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'symlink');
				t.equal(namespace.get('test'), 'symlink', 'state has been mutated');

				fs.symlink(FILENAME, LINKNAME, function(error) {
					t.notOk(error, "creating a symlink shouldn't error");

					t.equal(namespace.get('test'), 'symlink',
						"mutated state has persisted to fs.symlink's callback");

					const pointed = fs.readlinkSync(LINKNAME);
					t.equal(pointed, FILENAME, 'symlink points back to original file');

					t.notOk(fs.unlinkSync(LINKNAME), 'symlink has been removed');
					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.readlink', function(t) {
			if (os.platform() === 'win32') {return t.end();}
			const FILENAME = createLink(t);

			namespace.run(function() {
				namespace.set('test', 'readlink');
				t.equal(namespace.get('test'), 'readlink', 'state has been mutated');

				fs.readlink(LINKNAME, function(error, pointed) {
					t.notOk(error, "reading symlink shouldn't error");

					t.equal(namespace.get('test'), 'readlink',
						"mutated state has persisted to fs.readlink's callback");

					t.equal(pointed, FILENAME, 'symlink points back to original file');

					deleteLink(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.unlink', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'unlink');
				t.equal(namespace.get('test'), 'unlink', 'state has been mutated');

				fs.unlink(FILENAME, function(error) {
					t.notOk(error, "deleting file shouldn't error");

					t.equal(namespace.get('test'), 'unlink',
						"mutated state has persisted to fs.unlink's callback");

					t.notOk(fs.existsSync(FILENAME), 'file should be gone');
					t.end();
				});
			});
		});

		t.test('fs.realpath', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'realpath');
				t.equal(namespace.get('test'), 'realpath', 'state has been mutated');

				fs.realpath(FILENAME, function(error, real) {
					t.notOk(error, "deleting file shouldn't error");

					t.equal(namespace.get('test'), 'realpath',
						"mutated state has persisted to fs.realpath's callback");

					t.equal(real, path.resolve(FILENAME), 'no funny business with the real path');

					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.mkdir', function(t) {
			namespace.run(function() {
				namespace.set('test', 'mkdir');
				t.equal(namespace.get('test'), 'mkdir', 'state has been mutated');

				fs.mkdir(DIRNAME, function(error) {
					t.notOk(error, "creating directory shouldn't error");

					t.equal(namespace.get('test'), 'mkdir',
						"mutated state has persisted to fs.mkdir's callback");

					t.ok(fs.existsSync(DIRNAME), 'directory was created');

					fs.rmdirSync(DIRNAME);
					t.end();
				});
			});
		});

		t.test('fs.rmdir', function(t) {
			createDirectory(t);

			namespace.run(function() {
				namespace.set('test', 'rmdir');
				t.equal(namespace.get('test'), 'rmdir', 'state has been mutated');

				fs.rmdir(DIRNAME, function(error) {
					t.notOk(error, "deleting directory shouldn't error");

					t.equal(namespace.get('test'), 'rmdir',
						"mutated state has persisted to fs.rmdir's callback");

					t.notOk(fs.existsSync(DIRNAME), 'directory was removed');

					t.end();
				});
			});
		});

		t.test('fs.readdir', function(t) {
			createDirectory(t);

			const file1 = fs.openSync(path.join(DIRNAME, 'file1'), 'w');
			fs.writeSync(file1, 'one');
			fs.closeSync(file1);

			const file2 = fs.openSync(path.join(DIRNAME, 'file2'), 'w');
			fs.writeSync(file2, 'two');
			fs.closeSync(file2);

			const file3 = fs.openSync(path.join(DIRNAME, 'file3'), 'w');
			fs.writeSync(file3, 'three');
			fs.closeSync(file3);

			namespace.run(function() {
				namespace.set('test', 'readdir');
				t.equal(namespace.get('test'), 'readdir', 'state has been mutated');

				fs.readdir(DIRNAME, function(error, contents) {
					t.notOk(error, "reading directory shouldn't error");

					t.equal(namespace.get('test'), 'readdir',
						"mutated state has persisted to fs.readdir's callback");

					t.equal(contents.length, 3, '3 files were found');

					fs.unlinkSync(path.join(DIRNAME, 'file1'));
					fs.unlinkSync(path.join(DIRNAME, 'file2'));
					fs.unlinkSync(path.join(DIRNAME, 'file3'));
					deleteDirectory();
					t.end();
				});
			});
		});

		t.test('fs.watch', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'watch');
				t.equal(namespace.get('test'), 'watch', 'state has been mutated');

				const watcher = fs.watch(FILENAME,
					function(event) {
						t.equal(namespace.get('test'), 'watch',
							"mutated state has persisted to fs.watch's callback");

						t.equal(event, 'change', 'file was changed');

						watcher.close();
						process.nextTick(function cleanup() {
							deleteFile(FILENAME);
							t.end();
						});
					});

				setTimeout(function poke() {
					fs.writeFileSync(FILENAME, 'still a test');
				}, 20);
			});
		});

		t.test('fs.utimes', function(t) {
			const FILENAME = createFile(t);

			/* utimes(2) takes seconds since the epoch, and Date() deals with
       * milliseconds. I just want a date some time in the past.
       */
			const PASTIME = new Date(Math.floor((Date.now() - 31337) / 1000) * 1000);

			namespace.run(function() {
				namespace.set('test', 'utimes');
				t.equal(namespace.get('test'), 'utimes', 'state has been mutated');

				const before = fs.statSync(FILENAME);
				t.ok(before.atime, 'access time of newly-created file set');
				t.ok(before.mtime, 'modification time of newly-created file set');

				fs.utimes(FILENAME, PASTIME, PASTIME, function(error) {
					t.notOk(error, "setting utimes shouldn't error");

					t.equal(namespace.get('test'), 'utimes',
						"mutated state has persisted to fs.utimes's callback");

					const after = fs.statSync(FILENAME);
					t.same(after.atime, PASTIME, 'access time of newly-created file is reset');
					t.same(after.mtime, PASTIME, 'mod time of newly-created file is reset');
					t.notSame(before.atime, after.atime, 'access time changed');
					t.notSame(before.mtime, after.mtime, 'mod time changed');

					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.futimes', function(t) {
			const FILENAME = createFile(t);

			/* futimes(2) takes seconds since the epoch, and Date() deals with
       * milliseconds. I just want a date some time in the past.
       */
			const PASTIME = new Date(Math.floor((Date.now() - 0xb33fd) / 1000) * 1000);

			namespace.run(function() {
				namespace.set('test', 'futimes');
				t.equal(namespace.get('test'), 'futimes', 'state has been mutated');

				const before = fs.statSync(FILENAME);
				t.ok(before.atime, 'access time of newly-created file set');
				t.ok(before.mtime, 'modification time of newly-created file set');

				const file = fs.openSync(FILENAME, 'w+');
				fs.futimes(file, PASTIME, PASTIME, function(error) {
					t.notOk(error, "setting futimes shouldn't error");
					fs.closeSync(file);

					t.equal(namespace.get('test'), 'futimes',
						"mutated state has persisted to fs.futimes's callback");

					const after = fs.statSync(FILENAME);
					t.same(after.atime, PASTIME, 'access time of newly-created file is reset');
					t.same(after.mtime, PASTIME, 'mod time of newly-created file is reset');
					t.notSame(before.atime, after.atime, 'access time changed');
					t.notSame(before.mtime, after.mtime, 'mod time changed');

					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.fsync', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'fsync');
				t.equal(namespace.get('test'), 'fsync', 'state has been mutated');

				const file = fs.openSync(FILENAME, 'w+');
				fs.fsync(file, function(error) {
					t.notOk(error, "syncing the file shouldn't error");

					t.equal(namespace.get('test'), 'fsync',
						"mutated state has persisted to fs.fsync's callback");

					fs.closeSync(file);
					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.open', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'open');
				t.equal(namespace.get('test'), 'open', 'state has been mutated');

				fs.open(FILENAME, 'r', function(error, file) {
					t.notOk(error, "opening the file shouldn't error");

					t.equal(namespace.get('test'), 'open',
						"mutated state has persisted to fs.open's callback");


					const contents = Buffer.alloc(4);
					fs.readSync(file, contents, 0, 4, 0);
					t.equal(contents.toString(), 'UHOH', 'contents are still available');

					fs.closeSync(file);
					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.close', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'close');
				t.equal(namespace.get('test'), 'close', 'state has been mutated');

				const file = fs.openSync(FILENAME, 'r');
				fs.close(file, function(error) {
					t.notOk(error, "closing the file shouldn't error");

					t.equal(namespace.get('test'), 'close',
						"mutated state has persisted to fs.close's callback");

					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.read', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'read');
				t.equal(namespace.get('test'), 'read', 'state has been mutated');

				const file = fs.openSync(FILENAME, 'r')
					, contents = Buffer.alloc(4)
          ;
				fs.read(file, contents, 0, 4, 0, function(error) {
					t.notOk(error, "reading from the file shouldn't error");

					t.equal(namespace.get('test'), 'read',
						"mutated state has persisted to fs.read's callback");

					t.equal(contents.toString(), 'UHOH', 'contents are still available');

					fs.closeSync(file);
					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.write', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'write');
				t.equal(namespace.get('test'), 'write', 'state has been mutated');

				const file = fs.openSync(FILENAME, 'w')
					, contents = Buffer.from('yeap')
          ;
				fs.write(file, contents, 0, 4, 0, function(error) {
					t.notOk(error, "writing to the file shouldn't error");

					t.equal(namespace.get('test'), 'write',
						"mutated state has persisted to fs.write's callback");

					fs.closeSync(file);

					const readback = fs.readFileSync(FILENAME);
					t.equal(readback.toString(), 'yeap', 'contents are still available');

					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.readFile', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'readFile');
				t.equal(namespace.get('test'), 'readFile', 'state has been mutated');

				fs.readFile(FILENAME, function(error, contents) {
					t.notOk(error, "reading from the file shouldn't error");

					t.equal(namespace.get('test'), 'readFile',
						"mutated state has persisted to fs.readFile's callback");

					t.equal(contents.toString(), 'UHOH', 'contents are still available');

					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.writeFile', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'writeFile');
				t.equal(namespace.get('test'), 'writeFile', 'state has been mutated');

				fs.writeFile(FILENAME, 'woopwoop', function(error) {
					t.notOk(error, "rewriting the file shouldn't error");

					t.equal(namespace.get('test'), 'writeFile',
						"mutated state has persisted to fs.writeFile's callback");

					const readback = fs.readFileSync(FILENAME);
					t.equal(readback.toString(), 'woopwoop', 'rewritten contents are available');

					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.appendFile', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'appendFile');
				t.equal(namespace.get('test'), 'appendFile', 'state has been mutated');

				fs.appendFile(FILENAME, '/jk', function(error) {
					t.notOk(error, "appending to the file shouldn't error");

					t.equal(namespace.get('test'), 'appendFile',
						"mutated state has persisted to fs.appendFile's callback");

					const readback = fs.readFileSync(FILENAME);
					t.equal(readback.toString(), 'UHOH/jk',
						'appended contents are still available');

					deleteFile(FILENAME);
					t.end();
				});
			});
		});

		t.test('fs.exists', function(t) {
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'exists');
				t.equal(namespace.get('test'), 'exists', 'state has been mutated');

				fs.exists(FILENAME, function(yep) {
					t.equal(namespace.get('test'), 'exists',
						"mutated state has persisted to fs.exists's callback");

					t.ok(yep, 'precreated file does indeed exist.');

					fs.exists('NOPENOWAY', function(nope) {
						t.equal(namespace.get('test'), 'exists',
							"mutated state continues to persist to fs.exists's second callback");

						t.notOk(nope, "nonexistent file doesn't exist.");

						deleteFile(FILENAME);
						t.end();
					});
				});
			});
		});

		t.test('fs.watchFile', {timeout: 10000, diagnostic: true}, function(t) {
			t.comment('starting: fs.watchFile test');
			const FILENAME = createFile(t);

			namespace.run(function() {
				namespace.set('test', 'watchFile');
				t.equal(namespace.get('test'), 'watchFile', 'state has been mutated');

				t.comment('starting: watchFile on ' + FILENAME);
				fs.watchFile(FILENAME, {persistent: true, interval: 1}, function(before, after) {
					t.comment('event: watchFile evented ' + FILENAME);
					t.equal(namespace.get('test'), 'watchFile', "mutated state has persisted to fs.watchFile's callback");

					t.ok(before.ino, 'file has an entry');
					t.equal(before.ino, after.ino, 'file is at the same location');

					fs.unwatchFile(FILENAME);
					process.nextTick(function() {
						deleteFile(FILENAME);
						t.end();
					}, 10);
				});

				setTimeout(function poke() {
					t.comment('poking: ' + FILENAME);
					fs.appendFileSync(FILENAME, 'still a test');
				}, 10);
			});
		});
	});
});
