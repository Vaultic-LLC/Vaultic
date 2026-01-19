import { DataSource } from "typeorm";
import { ChangeTracking } from "../../Core/Main/Database/Entities/ChangeTracking";
import { Log } from "../../Core/Main/Database/Entities/Log";
import { AppStoreState } from "../../Core/Main/Database/Entities/States/AppStoreState";
import { FilterStoreState } from "../../Core/Main/Database/Entities/States/FilterStoreState";
import { GroupStoreState } from "../../Core/Main/Database/Entities/States/GroupStoreState";
import { PasswordStoreState } from "../../Core/Main/Database/Entities/States/PasswordStoreState";
import { UserPreferencesStoreState } from "../../Core/Main/Database/Entities/States/UserPreferencesStoreState";
import { ValueStoreState } from "../../Core/Main/Database/Entities/States/ValueStoreState";
import { VaultPreferencesStoreState } from "../../Core/Main/Database/Entities/States/VaultPreferencesStoreState";
import { VaultStoreState } from "../../Core/Main/Database/Entities/States/VaultStoreState";
import { User } from "../../Core/Main/Database/Entities/User";
import { UserVault } from "../../Core/Main/Database/Entities/UserVault";
import { Vault } from "../../Core/Main/Database/Entities/Vault";
import { CreateSchema1722604318830 } from "../../Core/Main/Database/Migrations/1722604318830-CreateSchema";

import { CapacitorSQLite, SQLiteConnection } from '@capacitor-community/sqlite';

const DATABASE_NAME = "vaulticDB";

let sqliteConnection: SQLiteConnection | undefined;
let dataSource: DataSource | undefined;

export function createDataSource(_: boolean)
{
    sqliteConnection = new SQLiteConnection(CapacitorSQLite);

    dataSource = new DataSource({
        name: 'vaulticConnection',
        database: DATABASE_NAME,
		type: "capacitor",
        driver: sqliteConnection,
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
		migrations: [CreateSchema1722604318830],
	});

	return dataSource;
}

export async function deleteDatabase(_: boolean)
{
	await dataSource?.destroy();
	dataSource = undefined;

	// give time for the database to fully close
	await new Promise(resolve => setTimeout(resolve, 1000));

    await sqliteConnection?.closeConnection(DATABASE_NAME, false);

    return true;
}