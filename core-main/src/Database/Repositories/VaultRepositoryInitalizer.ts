import { environment } from "../../Environment";
import { Vault } from "../Entities/Vault";
import { DisplayVault, VaultRepository } from "../../Types/Repositories";
import { Repository } from "typeorm";
import { VaulticRepositoryInitalizer } from "./VaulticRepositoryInitalizer";

class VaultRepositoryInitalizer extends VaulticRepositoryInitalizer<Vault, VaultRepository>
{
    protected getRepository(): Repository<Vault> | undefined
    {
        return environment.databaseDataSouce.getRepository(Vault);
    }

    protected getRepositoryExtension(): any 
    {
        return {
            createNewVault: this.createNewVault,
            getAllVaults: this.getAllVaults,
            getAllDisplayVaults: this.getAllDisplayVaults
        }
    }

    protected async createNewVault(name: string, color: string = '#FFFFFF')
    {
        const vault = new Vault();
        vault.name = name;
        vault.color = color;
        vault.vaultIdentifier = environment.utilities.generator.uniqueId();
        vault.appStoreState = "{}";
        vault.settingsStoreState = "{}";
        vault.passwordStoreState = "{}";
        vault.valueStoreState = "{}";
        vault.filterStoreState = "{}";
        vault.groupStoreState = "{}";
        vault.userPreferencesStoreState = "{}";

        return vault;
    }

    protected async getAllVaults(): Promise<Vault[] | null>
    {
        const currentUser = environment.repositories.users.getCurrentUser();
        if (!currentUser)
        {
            return null;
        }

        return this.repository
            .createQueryBuilder('vault')
            .leftJoinAndSelect('vault.userVaults', 'userVaults')
            .where('userVaults.userID = :userID', { userID: currentUser?.userID })
            .execute();
    }

    protected async getAllDisplayVaults(): Promise<DisplayVault[]>
    {
        const vaults = await this.getAllVaults();
        if (!vaults)
        {
            return [];
        }

        return vaults.map(v => 
        {
            return {
                name: v.name,
                identifier: v.vaultIdentifier,
                color: v.color
            }
        })
    }
}

const vaultRepositoryInitalizer: VaultRepositoryInitalizer = new VaultRepositoryInitalizer();
export default vaultRepositoryInitalizer;