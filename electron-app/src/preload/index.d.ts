import { ElectronAPI } from '@electron-toolkit/preload'
import child_process from 'child_process';
import fs from "fs";
import os from "os";
import { API } from "./Objects/API"

declare global
{
	interface Window
	{
		electron: ElectronAPI,
		api: API
	}
}
