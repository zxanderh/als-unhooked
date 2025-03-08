import ALS from './als.js';

export type ALSGlobal = typeof ALS & ALS;

const als = ALS as ALSGlobal;

const defaultInstance = new ALS();
Reflect.ownKeys(ALS.prototype).filter(k => k !== 'constructor').forEach((key) => {
	ALS[key] = defaultInstance[key].bind(defaultInstance);
});
Object.defineProperty(ALS, Symbol('defaultInstance'), { enumerable: false, get: () => defaultInstance });

export { als as ALS };
export default als;
export {
	MapLike,
} from './util/_common.js';
