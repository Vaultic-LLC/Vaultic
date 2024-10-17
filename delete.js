const fs = require("fs");

const src = getArg('src');

if (src == undefined)
{
    return;
}

fs.rmSync(src, { recursive: true, force: true });

function getArg(argName)
{
    const argArray = process.argv.filter(a => a.startsWith(argName));
    if (argArray.length == 0)
    {
        console.log(`No ${argName} specified`);
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