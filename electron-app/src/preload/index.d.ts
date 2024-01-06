import { ElectronAPI } from '@electron-toolkit/preload'

declare global
{
	interface Window
	{
		electron: ElectronAPI,
		userData: string,
		api: unknown
	}
}
