import { contextBridge, ipcRenderer } from 'electron'
import api from './API'

if (process.contextIsolated)
{
	try
	{
		contextBridge.exposeInMainWorld('api', api);

	} catch (error)
	{
		console.error(error)
	}
}
