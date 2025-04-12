'use strict';

import { expect } from 'chai';

import cls from 'als-unhooked/legacy';

describe('cls namespace management', function() {
	let namespaceTest;

	it('name is required', function() {
		expect(() => cls.createNamespace()).to.throw();
	});

	before(function() {
		namespaceTest = cls.createNamespace('test');
	});

	it('namespace is returned upon creation', function() {
		expect(namespaceTest).to.be.ok;
	});

	it('namespace lookup works', function() {
		expect(cls.getNamespace('test')).to.equal(namespaceTest);
	});

	it('allows resetting namespaces', function() {
		expect(cls.reset).to.not.throw();
	});

	it('namespaces have been reset', function() {
		Object.keys(process[cls.NAMESPACES_SYMBOL]).length.should.equal(0);
	});

	it('namespace is available from global', function() {
		cls.createNamespace('another');
		expect(process[cls.NAMESPACES_SYMBOL].another).to.be.ok;
	});

	it('destroying works', function() {
		expect(() => cls.destroyNamespace('another')).to.not.throw();
	});

	it('namespace has been removed', function() {
		expect(process[cls.NAMESPACES_SYMBOL].another).to.not.be.ok;
	});

});
