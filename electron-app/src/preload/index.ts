import api from './API'
const { contextBridge } = require('electron')

if (process.contextIsolated)
{
	try
	{
		contextBridge.exposeInMainWorld('api', api);
	}
	catch (error)
	{
		console.error(error)
	}
}
