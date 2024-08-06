import { electronAPI } from "@electron-toolkit/preload";
import { DataSource } from "typeorm";
import Database from "better-sqlite3";
import { checkMakeDirectory } from "./Files/File";
import { User } from "../Core/Database/Entities/User";
import { UserVault } from "../Core/Database/Entities/UserVault";
import { Vault } from "../Core/Database/Entities/Vault";

import { CreateSchema1722604318830 } from "../Core/Database/Migrations/1722604318830-CreateSchema";

export function createDataSource(isTest: boolean)
{
	let directory = electronAPI.process.env.APPDATA || (electronAPI.process.platform == 'darwin' ? electronAPI.process.env.HOME + '/Library/Preferences' : electronAPI.process.env.HOME + "/.local/share");
	directory += isTest ? "\\Vaultic\\VTest" : "\\Vaultic\\VCustom";

	checkMakeDirectory(directory);

	const database = directory + "\\vaultic.db";

	// create the database if it doesn't already exist
	new Database(database, { verbose: console.log });

	return new DataSource({
		type: "better-sqlite3",
		database: database,
		entities: [User, UserVault, Vault],
		migrationsRun: true,
		migrations: [CreateSchema1722604318830]
	});
}
