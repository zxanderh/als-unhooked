import { ALS as _ALS } from './als.js';

class ALS extends _ALS {}

const defaultInstance = new ALS();
Reflect.ownKeys(_ALS.prototype).filter(k => k !== 'constructor').forEach((key) => {
	ALS[key] = defaultInstance[key].bind(defaultInstance);
});

export { ALS };
export default ALS;
