import { DataSource } from "typeorm";
import { ChangeTracking } from "../Main/Database/Entities/ChangeTracking";
import { Log } from "../Main/Database/Entities/Log";
import { AppStoreState } from "../Main/Database/Entities/States/AppStoreState";
import { FilterStoreState } from "../Main/Database/Entities/States/FilterStoreState";
import { GroupStoreState } from "../Main/Database/Entities/States/GroupStoreState";
import { PasswordStoreState } from "../Main/Database/Entities/States/PasswordStoreState";
import { UserPreferencesStoreState } from "../Main/Database/Entities/States/UserPreferencesStoreState";
import { ValueStoreState } from "../Main/Database/Entities/States/ValueStoreState";
import { VaultPreferencesStoreState } from "../Main/Database/Entities/States/VaultPreferencesStoreState";
import { VaultStoreState } from "../Main/Database/Entities/States/VaultStoreState";
import { User } from "../Main/Database/Entities/User";
import { UserVault } from "../Main/Database/Entities/UserVault";
import { Vault } from "../Main/Database/Entities/Vault";
import { CreateSchema1722604318830 } from "../main/Database/Migrations/1722604318830-CreateSchema";
import localForage from "localforage";

let dataSource: DataSource | undefined;

export function createDataSource(isTest: boolean)
{
	dataSource = new DataSource({
		type: "sqljs",
        location: "vaulticDB",
        useLocalForage: true,
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

	// give time for the database to fully close
	await new Promise(resolve => setTimeout(resolve, 1000));

    await localForage.clear();
    return true;
}