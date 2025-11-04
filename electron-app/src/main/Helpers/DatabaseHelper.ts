import { electronAPI } from "@electron-toolkit/preload";
import fs from "fs";
import { DataSource } from "typeorm";
import Database from "better-sqlite3";
import sqlite3 from 'sqlite3';
import { User } from "../Core/Database/Entities/User";
import { UserVault } from "../Core/Database/Entities/UserVault";
import { Vault } from "../Core/Database/Entities/Vault";

import { CreateSchema1722604318830 } from "../Core/Database/Migrations/1722604318830-CreateSchema";
import { AppStoreState } from "../Core/Database/Entities/States/AppStoreState";
import { UserPreferencesStoreState } from "../Core/Database/Entities/States/UserPreferencesStoreState";
import { VaultPreferencesStoreState } from "../Core/Database/Entities/States/VaultPreferencesStoreState";
import { VaultStoreState } from "../Core/Database/Entities/States/VaultStoreState";
import { PasswordStoreState } from "../Core/Database/Entities/States/PasswordStoreState";
import { ValueStoreState } from "../Core/Database/Entities/States/ValueStoreState";
import { FilterStoreState } from "../Core/Database/Entities/States/FilterStoreState";
import { GroupStoreState } from "../Core/Database/Entities/States/GroupStoreState";
import { Log } from "../Core/Database/Entities/Log";
import { ChangeTracking } from "../Core/Database/Entities/ChangeTracking";
import { app } from "electron";

let database: Database | undefined = undefined;
let dataSource: DataSource | undefined;

export function getDirectory(isTest: boolean)
{
	let directory: string = "";
	switch (electronAPI.process.platform)
	{
		case "win32":
			directory = (electronAPI.process.env.APPDATA! + (isTest ? "\\Vaultic\\VTest" : "\\Vaultic\\VCustom"))
			break;
		case "darwin":
			directory = (app.getPath("userData") + (isTest ? "/VTest" : "/VCustom"));
			break;
		case "linux":
			directory = electronAPI.process.env.HOME + "/.local/share" + isTest ? "/Vaultic/VTest" : "/Vaultic/VCustom";
			break;
	}

	return directory;
}

function checkMakeDirectory(directory: string): void
{
	if (!fs.existsSync(directory))
	{
		try
		{
			fs.mkdirSync(directory);
		}
		catch (e) { console.log(e) }
	}
}

function databaseFilePath()
{
	switch (electronAPI.process.platform)
	{
		case "win32":
			return "\\vaultic.db";
		case "darwin":
		case "linux":
			return "/vaultic.db";
	}

	return "";
}

export function createDataSource(isTest: boolean)
{
	const directory = getDirectory(isTest);
	checkMakeDirectory(directory);

	let databaseDirectory = directory + databaseFilePath();

	if (isTest)
	{
		database = new Database(databaseDirectory, { verbose: console.log });
	}
	else
	{
		database = new Database(databaseDirectory);
	}

	dataSource = new DataSource({
		type: "better-sqlite3",
		database: databaseDirectory,
		entities: [
			Log,
			User,
			AppStoreState,
			UserPreferencesStoreState,
			UserVault,
			VaultPreferencesStoreState,
			Vault,
			VaultStoreState,
			PasswordStoreState,
			ValueStoreState,
			FilterStoreState,
			GroupStoreState,
			ChangeTracking
		],
		migrationsRun: true,
		migrations: [CreateSchema1722604318830]
	});

	return dataSource;
}

export async function deleteDatabase(isTest: boolean)
{
	await dataSource?.destroy();
	dataSource = undefined;
	database?.close();

	// give time for the database to fully close
	await new Promise(resolve => setTimeout(resolve, 1000));

	return new Promise<boolean>((resolve) =>
	{
		fs.unlink(getDirectory(isTest) + databaseFilePath(), (err) =>
		{
			console.log("delete database error", err);
			resolve(!err);
		});
	});
}