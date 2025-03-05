'use strict';

import tap, { Test } from 'tap';
// import { expect } from 'chai';
import Support from '../support.js';
import { Sequelize, DataTypes, Model, ModelStatic, QueryTypes } from 'sequelize';
import cls, { Namespace } from 'als-unhooked/legacy';
import { setTimeout as delay } from 'node:timers/promises';
// import sinon from 'sinon';

const sequelize = Support.sequelize as Sequelize;
let User: ModelStatic<Model<{ id?: number; name: string }> & { id: number; name: string }>;
let ns: Namespace;

function setup(t: Test) {
	t.beforeEach(() => {
		Sequelize.useCLS(cls.createNamespace('sequelize'));
	});

	t.afterEach(() => {
		cls.destroyNamespace('sequelize');
		// @ts-expect-error need access to private var
		delete Sequelize._cls;
	});

	t.beforeEach(async () => {
		ns = cls.getNamespace('sequelize');
		User = sequelize.define('user', {
			name: DataTypes.STRING,
		});
		await sequelize.sync({ force: true });
	});
}

await tap.test('Sequelize Integration (Legacy API)', async (t) => {

	t.test(async (t) => {
		setup(t);

		t.test('does not use continuation storage on manually managed transactions', async (t) => {
			// @ts-expect-error need access to private method
			await Sequelize._clsRun(async () => {
				const transaction = await sequelize.transaction();
				t.notOk(ns.get('transaction'));
				await transaction.rollback();
			});
		});

		t.test('supports several concurrent transactions', async (t) => {
			let t1id, t2id;
			await Promise.all([
				sequelize.transaction(async () => {
					t1id = ns.get('transaction').id;
				}),
				sequelize.transaction(async () => {
					t2id = ns.get('transaction').id;
				}),
			]);
			t.ok(t1id);
			t.ok(t2id);
			t.not(t1id, t2id);
		});

		t.test('supports nested promise chains', async (t) => {
			await sequelize.transaction(async () => {
				const tid = ns.get('transaction').id;

				await User.findAll();
				t.ok(ns.get('transaction').id);
				t.equal(ns.get('transaction').id, tid);
			});
			t.end();
		});

		t.test('does not leak variables to the outer scope', async (t) => {
			let transactionSetup = false,
				transactionEnded = false;

			const clsTask = sequelize.transaction(async () => {
				transactionSetup = true;
				await delay(500);
				t.ok(ns.get('transaction'));
				transactionEnded = true;
			});

			await new Promise<void>((resolve) => {
				const interval = setInterval(() => {
					if (transactionSetup) {
						clearInterval(interval);
						resolve();
					}
				}, 200);
			});
			t.notOk(transactionEnded);

			t.notOk(ns.get('transaction'));

			t.notOk(transactionEnded);
			await clsTask;
		});

		t.test('does not leak variables to the following promise chain', async (t) => {
			await sequelize.transaction(async () => {});
			t.notOk(ns.get('transaction'));
		});

		t.test('does not leak outside findOrCreate', async (t) => {
			t.resolves(async () => {
				await User.findOrCreate({
					where: {
						name: 'Kafka',
					},
					logging(sql) {
						if (/default/.test(sql)) {
							throw new Error('The transaction was not properly assigned');
						}
					},
				});

				await User.findAll();
			});
		});
	});

	t.test('sequelize.query integration', async (t) => {
		setup(t);
		await t.test('automagically uses the transaction in all calls', async (t) => {
			await sequelize.transaction(async () => {
				await User.create({ name: 'bob' });
				const [u1, u2] = await Promise.all([
					User.findAll({ transaction: null }),
					User.findAll({}),
				]);
				t.equal(u1.length, 0);
				t.equal(u2.length, 1);
			});
		});

		await t.test('automagically uses the transaction in all calls with async/await', async (t) => {
			await sequelize.transaction(async () => {
				await User.create({ name: 'bob' });
				t.match(await User.findAll({ transaction: null }), { length: 0 });
				t.match(await User.findAll({}), { length: 1 });
			});
		});
	});

	t.test('Model Hook integration', async (t) => {
		setup(t);

		function testHooks(
			{ method, hooks: hookNames, optionPos, execute, getModel }: {
				method: string;
				hooks: string[];
				optionPos: number;
				execute: (x: typeof User) => Promise<void>;
				getModel: () => typeof User;
			}) {
			return t.test(`passes the transaction to hooks {${hookNames.join(',')}} when calling ${method}`, async (t) => {
				await sequelize.transaction(async transaction => {
					const hooks = Object.create(null) as Record<string, ReturnType<typeof t.captureFn>>;

					for (const hookName of hookNames) {
						hooks[hookName] = t.captureFn((...rgs) => rgs);
					}

					const User = Reflect.apply(getModel, this, []);

					for (const [hookName, spy] of Object.entries(hooks)) {
						User[hookName](spy);
					}

					await Reflect.apply(execute, this, [User]);

					for (const [hookName, spy] of Object.entries(hooks)) {
						t.equal(spy.calls[0].args[optionPos].transaction, transaction, `hook ${hookName} did not receive the transaction from ALS.`);
					}
				});
			});
		}

		testHooks({
			method: 'Model.bulkCreate',
			hooks: ['beforeBulkCreate', 'beforeCreate', 'afterCreate', 'afterBulkCreate'],
			optionPos: 1,
			async execute(User) {
				await User.bulkCreate([{ name: 'bob' }], { individualHooks: true });
			},
			getModel() {
				return User;
			},
		});

		testHooks({
			method: 'Model.findAll',
			hooks: ['beforeFind', 'beforeFindAfterExpandIncludeAll', 'beforeFindAfterOptions'],
			optionPos: 0,
			async execute(User) {
				await User.findAll();
			},
			getModel() {
				return User;
			},
		});

		testHooks({
			method: 'Model.findAll',
			hooks: ['afterFind'],
			optionPos: 1,
			async execute(User) {
				await User.findAll();
			},
			getModel() {
				return User;
			},
		});

		testHooks({
			method: 'Model.count',
			hooks: ['beforeCount'],
			optionPos: 0,
			async execute(User) {
				await User.count();
			},
			getModel() {
				return User;
			},
		});

		testHooks({
			method: 'Model.upsert',
			hooks: ['beforeUpsert', 'afterUpsert'],
			optionPos: 1,
			async execute(User) {
				await User.upsert({
					id: 1,
					name: 'bob',
				});
			},
			getModel() {
				return User;
			},
		});

		testHooks({
			method: 'Model.destroy',
			hooks: ['beforeBulkDestroy', 'afterBulkDestroy'],
			optionPos: 0,
			async execute(User) {
				await User.destroy({ where: { name: 'bob' } });
			},
			getModel() {
				return User;
			},
		});

		testHooks({
			method: 'Model.destroy with individualHooks',
			hooks: ['beforeDestroy', 'beforeDestroy'],
			optionPos: 1,
			async execute(User) {
				await User.create({ name: 'bob' });
				await User.destroy({ where: { name: 'bob' }, individualHooks: true });
			},
			getModel() {
				return User;
			},
		});

		testHooks({
			method: 'Model#destroy',
			hooks: ['beforeDestroy', 'beforeDestroy'],
			optionPos: 1,
			async execute(User) {
				const user = await User.create({ name: 'bob' });
				await user.destroy();
			},
			getModel() {
				return User;
			},
		});

		testHooks({
			method: 'Model.update',
			hooks: ['beforeBulkUpdate', 'afterBulkUpdate'],
			optionPos: 0,
			async execute(User) {
				await User.update({ name: 'alice' }, { where: { name: 'bob' } });
			},
			getModel() {
				return User;
			},
		});

		testHooks({
			method: 'Model.update with individualHooks',
			hooks: ['beforeUpdate', 'afterUpdate'],
			optionPos: 1,
			async execute(User) {
				await User.create({ name: 'bob' });
				await User.update({ name: 'alice' }, { where: { name: 'bob' }, individualHooks: true });
			},
			getModel() {
				return User;
			},
		});

		testHooks({
			method: 'Model#save (isNewRecord)',
			hooks: ['beforeCreate', 'afterCreate'],
			optionPos: 1,
			async execute(User) {
				const user = User.build({ name: 'bob' });
				user.name = 'alice';
				await user.save();
			},
			getModel() {
				return User;
			},
		});

		testHooks({
			method: 'Model#save (!isNewRecord)',
			hooks: ['beforeUpdate', 'afterUpdate'],
			optionPos: 1,
			async execute(User) {
				const user = await User.create({ name: 'bob' });
				user.name = 'alice';
				await user.save();
			},
			getModel() {
				return User;
			},
		});

		let ParanoidUser: typeof User;

		t.beforeEach(async () => {
			ParanoidUser = sequelize.define('ParanoidUser', {
				name: DataTypes.STRING,
			}, { paranoid: true });

			await ParanoidUser.sync({ force: true });
		});

		testHooks({
			method: 'Model.restore',
			hooks: ['beforeBulkRestore', 'afterBulkRestore'],
			optionPos: 0,
			async execute() {
				const User = ParanoidUser;
				await User.restore({ where: { name: 'bob' } });
			},
			getModel() {
				return ParanoidUser;
			},
		});

		testHooks({
			method: 'Model.restore with individualHooks',
			hooks: ['beforeRestore', 'afterRestore'],
			optionPos: 1,
			async execute() {
				const User = ParanoidUser;

				await User.create({ name: 'bob' });
				await User.destroy({ where: { name: 'bob' } });
				await User.restore({ where: { name: 'bob' }, individualHooks: true });
			},
			getModel() {
				return ParanoidUser;
			},
		});

		testHooks({
			method: 'Model#restore',
			hooks: ['beforeRestore', 'afterRestore'],
			optionPos: 1,
			async execute() {
				const User = ParanoidUser;

				const user = await User.create({ name: 'bob' });
				await user.destroy();
				await user.restore();
			},
			getModel() {
				return ParanoidUser;
			},
		});
	});

	t.test(async (t) => {
		setup(t);

		t.test('CLS namespace is stored in Sequelize._cls', (t) => {
			// @ts-expect-error need to access private var
			t.equal(Sequelize._cls, ns);
			t.end();
		});

		t.test('promises returned by sequelize.query are correctly patched', async (t) => {
			await sequelize.transaction(async (transaction) => {
				await sequelize.query(`select 1${ Support.addDualInSelect() }`, { type: QueryTypes.SELECT });
				t.equal(ns.get('transaction'), transaction);
			});
		});

		t.test('custom logging with benchmarking has correct CLS context', async (t) => {
			const logger = t.captureFn((...rgs) => {
				rgs.slice();
				return ns.get('value') as number;
			});
			const sequelize = Support.createSequelizeInstance({
				logging: logger,
				benchmark: true,
			});

			const result = ns.runPromise(async () => {
				ns.set('value', 1);
				await delay(500);
				return sequelize.query(`select 1${  Support.addDualInSelect()  };`);
			});

			await ns.runPromise(() => {
				ns.set('value', 2);
				return sequelize.query(`select 2${  Support.addDualInSelect()  };`);
			});

			await result;

			t.equal(logger.calls.length, 2);
			t.match(logger.calls[0].args[0], /Executed \((\d*|default)\): select 2/);
			t.match(logger.calls[0], { returned: 2 });
			t.match(logger.calls[1].args[0], /Executed \((\d*|default)\): select 1/);
			t.match(logger.calls[1], { returned: 1 });
		});
	});
});
