const fs = require("fs");

const src = getArg('src');
const dest = getArg('dest');

if (dest == undefined || src == undefined)
{
    return;
}

fs.cpSync(src, dest, { recursive: true });

function getArg(argName)
{
    const argArray = process.argv.filter(a => a.startsWith(argName));
    if (argArray.length == 0)
    {
        console.log("No app arg specified");
        return;
    }

    const args = argArray[0].split("=");
    if (args.length < 2)
    {
        console.log(`App arg not in format '${argName}={arg}'`);
        return;
    }

    return args[1];
}