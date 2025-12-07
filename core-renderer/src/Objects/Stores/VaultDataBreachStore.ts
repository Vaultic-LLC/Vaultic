import { Store, StoreEvents } from "./Base";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
import { api } from "../../API"
import { VaultDataBreach } from "@vaultic/shared/Types/ClientServerTypes";
import { computed, ComputedRef } from "vue";
import app from "./AppStore";
import { ReactivePassword } from "./ReactivePassword";
import { BreachRequestVault } from "@vaultic/shared/Types/DataTypes";
import { Password } from "../../Types/DataTypes";
import { ModifyBridge, StateKeys, StoreState, StoreType } from "@vaultic/shared/Types/Stores";
import { OH } from "@vaultic/shared/Utilities/PropertyManagers";

interface VaultDataBreachStoreState extends StoreState
{
    vaultDataBreaches: VaultDataBreach[];
    vaultDataBreachesByPasswordID: { [key: string]: VaultDataBreach };
    vaultDataBreacheCountByVaultID: { [key: number]: number};
    failedToLoadDataBreaches: boolean;
}

type DataBreachStoreEvent = StoreEvents | "onBreachDismissed" | "onBreachesUpdated";

export interface VaultDataBreachStoreModifyBridge extends ModifyBridge
{
    dismissVaultDataBreach: (vaultDataBreachID: number) => Promise<boolean>;
}

export class VaultDataBreachStore extends Store<VaultDataBreachStoreState, StateKeys, DataBreachStoreEvent, VaultDataBreachStoreModifyBridge>
{
    private internalVaultDataBreaches: ComputedRef<VaultDataBreach[]>;
    private internalVaultDataBreachesByPasswordID: ComputedRef<{ [key: string]: VaultDataBreach }>;
    private internalVaultDataBreacheCountByVaultID: ComputedRef<{ [key: number]: number }>;
    private internalFailedToLoadDataBreaches: ComputedRef<boolean>;
    private internalLoadedDataBreaches: ComputedRef<boolean>;

    get vaultDataBreaches() { return this.internalVaultDataBreaches.value; }
    get vaultBreachesByPasswordID() { return this.internalVaultDataBreachesByPasswordID; }
    get vaultDataBreachCountByVaultID() { return this.internalVaultDataBreacheCountByVaultID.value; }
    get failedToLoadDataBreaches() { return this.internalFailedToLoadDataBreaches.value; }
    get loadedDataBreaches() { return this.internalLoadedDataBreaches.value; }

    constructor()
    {
        super(StoreType.VaultDataBreach);

        this.internalVaultDataBreaches = computed(() => this.state.vaultDataBreaches);
        this.internalVaultDataBreachesByPasswordID = computed(() => this.state.vaultDataBreachesByPasswordID);
        this.internalVaultDataBreacheCountByVaultID = computed(() => this.state.vaultDataBreacheCountByVaultID);
        this.internalFailedToLoadDataBreaches = computed(() => this.state.failedToLoadDataBreaches);
        this.internalLoadedDataBreaches = computed(() => this.state.loadedDataBreaches);
    }

    protected defaultState()
    {
        return {
            version: 0,
            vaultDataBreaches: [],
            vaultDataBreachesByPasswordID: {},
            vaultDataBreacheCountByVaultID: {},
            failedToLoadDataBreaches: false,
            loadedDataBreaches: false
        };
    }

    public async getVaultDataBreaches(): Promise<boolean>
    {
        if (!app.isOnline)
        {
            return false;
        }

        this.resetToDefault();

        const postData: { [key: string]: any } =
        {
            Vaults: []
        };

        for (let i = 0; i < app.userVaults.value.length; i++)
        {
            const vault = app.userVaults.value[i];
            let limitedPasswords: { id: string, domain: string }[] = [];

            const vaultPostData: BreachRequestVault =
            {
                UserOrganizationID: vault.userOrganizationID,
                VaultID: vault.vaultID
            };

            if (vault.passwordsByDomain)
            {
                Object.keys(vault.passwordsByDomain).forEach(k =>
                {
                    // need to replace '+' with '.' since they were replaced in the password store to prevent
                    // errors when using addValue
                    const correctDomain = k.replace('+', '.');
                    limitedPasswords = limitedPasswords.concat(Object.keys(vault.passwordsByDomain![k]).map(v =>
                    {
                        return {
                            id: v,
                            domain: correctDomain
                        }
                    }))
                });
            }

            vaultPostData['LimitedPasswords'] = limitedPasswords;
            postData.Vaults.push(vaultPostData);
        }

        const response = await api.server.vault.getVaultDataBreaches(JSON.stringify(postData));
        if (!response.Success)
        {
            this.state.failedToLoadDataBreaches = true;
            this.state.loadedDataBreaches = true;

            return false;
        }

        if (response.DataBreaches)
        {
            for (let i = 0; i < response.DataBreaches.length; i++)
            {
                this.setBreach(response.DataBreaches[i]);
            }

            this.emit("onBreachesUpdated");
        }

        this.state.failedToLoadDataBreaches = false;
        this.state.loadedDataBreaches = true;

        return true;
    };

    public async checkPasswordsForBreach(passwords: Password[])
    {
        if (!app.isOnline)
        {
            return false;
        }

        const checkPasswordsForBreachData =
        {
            UserOrganizationID: app.currentVault.userOrganizationID,
            VaultID: app.currentVault.vaultID,
            LimitedPasswords: passwords.map(p =>
            {
                return {
                    id: p.id,
                    domain: p.d
                }
            })
        };

        const response = await api.server.vault.checkPasswordsForBreach(JSON.stringify(checkPasswordsForBreachData));
        if (!response.Success)
        {
            return false;
        }

        if (response.DataBreaches && response.DataBreaches.length > 0)
        {
            for (let i = 0; i < response.DataBreaches.length; i++)
            {
                this.setBreach(response.DataBreaches[i]);
            }

            this.emit("onBreachesUpdated");
        }

        return true;
    }

    public async checkPasswordForBreach(password: ReactivePassword)
    {
        if (!app.isOnline)
        {
            return false;
        }

        const checkPasswordForBreachData =
        {
            UserOrganizationID: app.currentVault.userOrganizationID,
            VaultID: app.currentVault.vaultID,
            LimitedPasswords:
                [{
                    id: password.id,
                    domain: password.d
                }]
        };

        const response = await api.server.vault.checkPasswordsForBreach(JSON.stringify(checkPasswordForBreachData));
        if (!response.Success)
        {
            return false;
        }

        if (response.DataBreaches && response.DataBreaches.length > 0)
        {
            this.setBreach(response.DataBreaches[0]);
            this.emit("onBreachesUpdated");
        }

        return true;
    }

    public async dismissVaultDataBreach(vaultDataBreachID: number): Promise<boolean>
    {
        if (!app.isOnline)
        {
            return false;
        }

        if (this.modifyBridge)
        {
            return await this.modifyBridge.dismissVaultDataBreach(vaultDataBreachID);
        }

        const response = await api.server.vault.dismissVaultDataBreach(app.currentVault.userOrganizationID, app.currentVault.vaultID, vaultDataBreachID);
        if (response.Success)
        {
            this.state.vaultDataBreaches = this.state.vaultDataBreaches.filter(b => b.VaultDataBreachID != vaultDataBreachID);
            OH.forEach(this.state.vaultDataBreachesByPasswordID, (k, v) =>
            {
                if (v.VaultDataBreachID == vaultDataBreachID)
                {
                    delete this.state.vaultDataBreachesByPasswordID[k];
                }
            });

            const currentBreachCount = this.state.vaultDataBreacheCountByVaultID[app.currentVault.vaultID];
            if (currentBreachCount == 1)
            {
                delete this.state.vaultDataBreacheCountByVaultID[app.currentVault.vaultID];
            }
            else
            {
                this.state.vaultDataBreacheCountByVaultID[app.currentVault.vaultID] = currentBreachCount - 1;
            }

            this.emit('onBreachDismissed');
            return true;
        }

        defaultHandleFailedResponse(response);
        return false;
    }

    public async clearDataBreaches(vaultIDs: number[]): Promise<boolean>
    {
        if (!app.isOnline)
        {
            return false;
        }

        const breachRequetVaults: BreachRequestVault[] = [];
        vaultIDs.forEach(v => 
        {
            const vault = app.userVaultsByVaultID.get(v);
            if (vault)
            {
                breachRequetVaults.push({
                    UserOrganizationID: vault.userOrganizationID,
                    VaultID: v
                });
            }
        });

        const result = await api.server.vault.clearDataBreaches(breachRequetVaults);
        if (!result.Success)
        {
            return false;
        }

        vaultIDs.forEach(vaultID =>
        {
            delete this.state.vaultDataBreacheCountByVaultID[vaultID];
            this.state.vaultDataBreaches = this.state.vaultDataBreaches.filter(b => b.VaultID != vaultID);
            OH.forEach(this.state.vaultDataBreachesByPasswordID, (k, vaultDataBreach) =>
            {
                if (vaultDataBreach.VaultID == vaultID)
                {
                    delete this.state.vaultDataBreachesByPasswordID[k];
                }
            })
        });

        this.emit('onBreachesUpdated');
        return true;
    }

    // TOOD: make sure this still works after removing PasswordID as a parameter
    private setBreach(dataBreach: VaultDataBreach)
    {
        let currentBreachCount = this.state.vaultDataBreacheCountByVaultID[dataBreach.VaultID];
        if (currentBreachCount === undefined)
        {
            currentBreachCount = 1;
        }
        else
        {
            currentBreachCount += 1;
        }

        this.state.vaultDataBreaches.push(dataBreach);
        this.state.vaultDataBreachesByPasswordID[dataBreach.PasswordID] = dataBreach;
        this.state.vaultDataBreacheCountByVaultID[dataBreach.VaultID] = currentBreachCount;
    }
}

