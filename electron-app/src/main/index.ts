import "reflect-metadata";

import * as PolyFills from "@vaultic/shared/Types/PolyFills";
PolyFills.a;

import { app, shell, BrowserWindow, session, nativeImage, Tray, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import setupIPC from './ipcSetup';
import http2 from "http2";

import { environment } from "./Core/Environment"
import generatorUtility from './Utilities/Generator';
import { getDeviceInfo } from './Objects/DeviceInfo';
import { createDataSource, deleteDatabase } from './Helpers/DatabaseHelper';
import { HashUtility } from "./Utilities/HashUtility";
import { CryptUtility } from "./Utilities/CryptUtility";
import { DataUtility } from "./Utilities/DataUtility";
import { handleUserLogOut } from "./Core/Helpers/RepositoryHelper";

let tray: Tray | null = null;
let mainWindow: BrowserWindow | null = null;

if (require('electron-squirrel-startup'))
{
	app.quit();
}
else
{
	function createTray()
	{
		const icon = join(__dirname, '/app.png'); // required.
		const trayicon = nativeImage.createFromPath(icon);

		tray = new Tray(trayicon.resize({ width: 16 }));
		const contextMenu = Menu.buildFromTemplate([
			{
				label: 'Open Vaultic',
				click: () =>
				{
					showOrCreateWindow()
				}
			},
			{
				label: 'Quit',
				click: () =>
				{
					app.quit() // actually quit the app.
				}
			},
		]);

		tray.setContextMenu(contextMenu);
	}

	async function createWindow(): Promise<void>
	{
		if (!tray)
		{
			createTray();
		}

		// Create the browser window.
		mainWindow = new BrowserWindow({
			show: false,
			autoHideMenuBar: true,
			...(process.platform === 'linux' ? { icon } : {}),
			webPreferences: {
				contextIsolation: true,
				preload: join(__dirname, '../preload/index.js'),
				backgroundThrottling: false,
				devTools: true
			}
		});

		mainWindow.on('ready-to-show', () =>
		{
			mainWindow?.maximize();
			mainWindow?.show()
		});

		mainWindow.webContents.setWindowOpenHandler((details) =>
		{
			shell.openExternal(details.url)
			return { action: 'deny' }
		});

		// HMR for renderer base on electron-vite cli.
		// Load the remote URL for development or the local html file for production.
		if (is.dev && process.env['ELECTRON_RENDERER_URL'])
		{
			mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
		}
		else
		{
			mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
		}
	}

	// We only want to allow one instance of the application at a time
	const instanceLock = app.requestSingleInstanceLock()
	if (!instanceLock)
	{
		app.quit()
	}
	else
	{
		app.on('second-instance', (event, commandLine, workingDirectory) =>
		{
			showOrCreateWindow();
		})
	}

	function showOrCreateWindow()
	{
		// Someone tried to run a second instance, we should focus our window.
		if (mainWindow)
		{
			if (mainWindow.isMinimized())
			{
				mainWindow.restore();
			}

			mainWindow.focus()
		}
		else
		{
			createWindow();
		}
	}

	// This method will be called when Electron has finished
	// initialization and is ready to create browser windows.
	// Some APIs can only be used after this event occurs.
	app.whenReady().then(async () =>
	{
		setupIPC();

		if (app.isPackaged)
		{
			await setupEnvironment(false);
		}
		else
		{
			//@ts-ignore
			const isTest = import.meta.env.VITE_ISTEST === "true";
			await setupEnvironment(isTest);
		}

		// Set app user model id for windows
		electronApp.setAppUserModelId('com.electron')

		// Default open or close DevTools by F12 in development
		// and ignore CommandOrControl + R in production.
		// see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
		app.on('browser-window-created', (_, window) =>
		{
			optimizer.watchWindowShortcuts(window)
		});

		createWindow()

		app.on('activate', async function ()
		{
			//await environment.repositories.logs.log(undefined, `Activate. Tray: ${!!tray}, Windows: ${BrowserWindow.getAllWindows().length}`);

			// On macOS it's common to re-create a window in the app when the
			// dock icon is clicked and there are no other windows open.
			if (BrowserWindow.getAllWindows().length === 0) createWindow()
		});
	});

	app.on('window-all-closed', async () =>
	{
		mainWindow = null;

		// don't call app.quit() since we want to back up the users data if possible
		app.dock?.hide(); // for macOS
		await handleUserLogOut();
	});

	app.on('web-contents-created', (event, contents) =>
	{
		// disable all attempted webviews
		contents.on('will-attach-webview', (event, webPreferences, params) =>
		{
			// Strip away preload scripts if unused or verify their location is legitimate
			delete webPreferences.preload;

			// Secure
			webPreferences.nodeIntegration = false
			webPreferences.allowRunningInsecureContent = false;
			webPreferences.contextIsolation = true;
			webPreferences.enableBlinkFeatures = undefined;
			webPreferences.experimentalFeatures = false;
			webPreferences.sandbox = true;
			webPreferences.webSecurity = true;

			// prevent webview
			event.preventDefault();
		});

		// disable all attempted navigation
		contents.on('will-navigate', (event) =>
		{
			event.preventDefault();
		});

		// no new windows should be opened
		contents.setWindowOpenHandler(() =>
		{
			return { action: 'deny' }
		});
	});

	async function setupEnvironment(isTest: boolean)
	{
		await environment.init({
			isTest,
			sessionHandler:
			{
				setSession,
				getSession
			},
			utilities:
			{
				crypt: new CryptUtility(),
				hash: new HashUtility(),
				generator: generatorUtility,
				data: new DataUtility()
			},
			database:
			{
				createDataSource,
				deleteDatabase
			},
			getDeviceInfo,
			hasConnection
		});
	}

	async function setSession(tokenHash: string): Promise<void>
	{
		const tokenHashCookie = { url: 'http://www.vaultic.co', name: 'TokenHash', value: tokenHash }
		await session.defaultSession.cookies.set(tokenHashCookie);
	}

	async function getSession(): Promise<string>
	{
		const cookies = await session.defaultSession.cookies.get({ url: 'http://www.vaultic.co' });
		if (cookies.length != 1)
		{
			return "";
		}

		return cookies[0].value ?? "";
	}

	function hasConnection(): Promise<boolean>
	{
		return new Promise((resolve) =>
		{
			const client = http2.connect('https://www.google.com');
			client.setTimeout(5000, () =>
			{
				resolve(false);
				client.destroy();
			});

			client.on('connect', () =>
			{
				resolve(true);
				client.destroy();
			});

			client.on('error', () =>
			{
				resolve(false);
				client.destroy();
			});
		});
	}
}
