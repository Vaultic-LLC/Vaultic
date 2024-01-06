import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { spawn } from 'child_process';

// Custom APIs for renderer
const api = {
	child_process: spawn
}

const userData: string = electronAPI.process.env.APPDATA || (electronAPI.process.platform == 'darwin' ? electronAPI.process.env.HOME + '/Library/Preferences' : electronAPI.process.env.HOME + "/.local/share");

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated)
{
	try
	{
		contextBridge.exposeInMainWorld('electron', electronAPI)
		contextBridge.exposeInMainWorld('api', api)
		contextBridge.exposeInMainWorld('userData', userData);
	} catch (error)
	{
		console.error(error)
	}
}
else
{
	// @ts-ignore (define in dts)
	window.electron = electronAPI
	// @ts-ignore (define in dts)
	window.api = api
	// @ts-ignore (define in dts)
	window.userData = userData
}
