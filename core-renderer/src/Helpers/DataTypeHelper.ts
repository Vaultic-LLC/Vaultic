import app from "../Objects/Stores/AppStore";

export function isOld(value: string): boolean
{
    const today = new Date().getTime();
    const lastModifiedTime = Date.parse(value);
    const differenceInDays = (today - lastModifiedTime) / 1000 / 86400;

    return differenceInDays >= app.settings.o;
}