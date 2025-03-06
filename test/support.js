import { Sequelize } from 'sequelize';
import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import { inspect } from 'node:util';
const { env } = process;
const { expect } = chai;

chai.use(sinonChai);
chai.use(chaiAsPromised);

chai.Assertion.addMethod('deepEqual', function(expected, depth = 5) {
	expect(inspect(this._obj, { depth })).to.deep.equal(inspect(expected, { depth }));
});

chai.config.includeStack = true;

if (global.beforeEach) {
	global.before(function() {
		this.sequelize = Support.sequelize;
	});
	global.beforeEach(function() {
		this.sequelize = Support.sequelize;
	});
}

const Config = {
	mysql: {
		database: env.SEQ_MYSQL_DB || env.SEQ_DB || 'sequelize_test',
		username: env.SEQ_MYSQL_USER || env.SEQ_USER || 'sequelize_test',
		password: env.SEQ_MYSQL_PW || env.SEQ_PW || 'sequelize_test',
		host: env.MYSQL_PORT_3306_TCP_ADDR || env.SEQ_MYSQL_HOST || env.SEQ_HOST || '127.0.0.1',
		port: env.MYSQL_PORT_3306_TCP_PORT || env.SEQ_MYSQL_PORT || env.SEQ_PORT || 20057,
		pool: {
			max: env.SEQ_MYSQL_POOL_MAX || env.SEQ_POOL_MAX || 5,
			idle: env.SEQ_MYSQL_POOL_IDLE || env.SEQ_POOL_IDLE || 3000,
		},
	},
};

const Support = {
	getTestDialectTeaser(moduleName) {
		let dialect = this.getTestDialect();

		if (process.env.DIALECT === 'postgres-native') {
			dialect = 'postgres-native';
		}

		return `[${dialect.toUpperCase()}] ${moduleName}`;
	},
	addDualInSelect() {
		return this.getTestDialect() === 'oracle' ? ' FROM DUAL' : '';
	},
	createSequelizeInstance(options) {
		options = options || {};
		options.dialect = Support.getTestDialect();

		const config = Config[options.dialect];

		const sequelizeOptions = {
			...options,
			host: options.host || config.host,
			logging: options.logging || (process.env.SEQ_LOG ? console.log : false),
			dialect: options.dialect,
			port: options.port || process.env.SEQ_PORT || config.port,
			pool: options.pool || config.pool,
			dialectOptions: options.dialectOptions || config.dialectOptions || {},
			minifyAliases: options.minifyAliases || config.minifyAliases,
		};

		if (process.env.DIALECT === 'postgres-native') {
			sequelizeOptions.native = true;
		}

		if (config.storage || config.storage === '') {
			sequelizeOptions.storage = config.storage;
		}

		return Support.getSequelizeInstance(config.database, config.username, config.password, sequelizeOptions);
	},
	// ! addtl
	getSequelizeInstance(db, user, pass, options) {
		options = options || {};
		options.dialect = options.dialect || this.getTestDialect();
		return new Sequelize(db, user, pass, options);
	},
	getTestDialect() {
		let envDialect = process.env.DIALECT || 'mysql';

		if (envDialect === 'postgres-native') {
			envDialect = 'postgres';
		}

		// if (!this.getSupportedDialects().includes(envDialect)) {
		// 	throw new Error(`The dialect you have passed is unknown. Did you really mean: ${envDialect}`);
		// }

		return envDialect;
	},
};

Support.sequelize = Support.createSequelizeInstance();

export default Support;
