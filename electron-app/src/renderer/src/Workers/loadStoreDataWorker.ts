import { CustomWorker } from '.';
import { stores } from '../Objects/Stores/index';

onmessage = (e) =>
{
	stores.loadStoreData(e.data);
	postMessage(true);
};

function loadStoreData(message: any)
{
	stores.loadStoreData(message.key);
}

const loadStoreDataWorker: CustomWorker =
{
	type: "loadStoreData",
	invoke: loadStoreData
};

export function getLoadStoreDataMessage(key: string)
{
	return {
		type: "loadStoreData",
		key: key
	}
}

export default loadStoreDataWorker;
