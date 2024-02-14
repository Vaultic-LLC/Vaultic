import registerPromiseWorker from 'promise-worker/register';
import loadStoreDataWorker from './loadStoreDataWorker';

export interface CustomWorker
{
	type: string;
	invoke: (message: any) => void;
}

let workers: CustomWorker[] = [];
workers.push(loadStoreDataWorker);

export default function registerWorkers()
{
	registerPromiseWorker((message: any) =>
	{
		for (let i = 0; i < workers.length; i++)
		{
			if (message.type == workers[i].type)
			{
				return workers[i].invoke(message);
			}
		}
	});
}
