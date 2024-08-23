import { DataFile } from "../Types/EncryptedData";
import app from "../Objects/Stores/AppStore";

// Uesd to read and write files. ContextBridge can only take simple types so we have to do most of
// the heavy lifting on the renderer side and then send just strings back and fourth

// TODO: Delete this
export interface FileHelper
{
    readUnencrypted: <T>(file: DataFile) => Promise<[boolean, T]>;
    writeUnencrypted: <T>(data: T, file: DataFile) => Promise<boolean>;
}

async function readUnencrypted<T>(file: DataFile): Promise<[boolean, T]>
{
    const result = await file.read();
    if (!result.success)
    {
        app.popups.showErrorAlert(result.logID);
        return [false, {} as T];
    }

    try
    {
        return [true, JSON.parse(result.value!) as T];
    }
    catch (e) { }

    return [false, {} as T];
}

async function writeUnencrypted<T>(data: T, file: DataFile): Promise<boolean>
{
    const jsonData: string = JSON.stringify(data);
    const result = await file.write(jsonData);
    if (!result.success)
    {
        app.popups.showErrorAlert(result.logID);
        return false;
    }

    return true;
}

const fileHelper: FileHelper =
{
    readUnencrypted,
    writeUnencrypted
};

export default fileHelper;
