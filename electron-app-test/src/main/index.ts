import { app, shell, BrowserWindow, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import setupIPC from './ipcSetup';

import { environment } from "./Core/Environment"
import cryptUtility from './Utilities/CryptUtility';
import hashUtility from './Utilities/HashUtility';
import generatorUtility from './Utilities/Generator';
import { getDeviceInfo } from './Objects/DeviceInfo';
import { createDataSource, deleteDatabase } from './Helpers/DatabaseHelper';

async function createWindow(): Promise<void>
{
    //@ts-ignore
    const isTest = import.meta.env.VITE_ISTEST === "true";
    await setupEnvironment(isTest);

    // needed for test environment to bypass ssl errors
    process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';

    // Create the browser window.
    const mainWindow = new BrowserWindow({
        show: false,
        autoHideMenuBar: true,
        ...(process.platform === 'linux' ? { icon } : {}),
        webPreferences: {
            contextIsolation: true,
            preload: join(__dirname, '../preload/index.js'),
            backgroundThrottling: false,
            devTools: is.dev
        }
    });

    mainWindow.on('ready-to-show', () =>
    {
        mainWindow.maximize();
        mainWindow.show()
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

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() =>
{
    setupIPC();

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

    app.on('activate', function ()
    {
        // On macOS it's common to re-create a window in the app when the
        // dock icon is clicked and there are no other windows open.
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
    });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () =>
{
    if (process.platform !== 'darwin')
    {
        app.quit()
    }
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
        sessionHandler: {
            setSession,
            getSession
        },
        utilities:
        {
            crypt: cryptUtility,
            hash: hashUtility,
            generator: generatorUtility
        },
        database:
        {
            createDataSource,
            deleteDatabase
        },
        getDeviceInfo,
    });
}

async function setSession(sessionKey: string): Promise<void>
{
    const sessionKeyCookie = { url: 'http://www.vaultic.co', name: 'SessionKey', value: sessionKey }
    await session.defaultSession.cookies.set(sessionKeyCookie);
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
