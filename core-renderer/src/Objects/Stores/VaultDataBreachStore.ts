import { Store, StoreEvents } from "./Base";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
import { api } from "../../API"
import { VaultDataBreach } from "@vaultic/shared/Types/ClientServerTypes";
import { ref, Ref } from "vue";
import app from "./AppStore";
import { ReactivePassword } from "./ReactivePassword";
import { BreachRequestVault } from "@vaultic/shared/Types/DataTypes";
import { Password } from "../../Types/DataTypes";
import { StoreState } from "@vaultic/shared/Types/Stores";

type DataBreachStoreEvent = StoreEvents | "onBreachDismissed" | "onBreachesUpdated";

export class VaultDataBreachStore extends Store<StoreState, DataBreachStoreEvent>
{
    private internalVaultDataBreaches: Ref<VaultDataBreach[]>;
    private internalVaultDataBreachesByPasswordID: Ref<Map<string, VaultDataBreach>>;
    private internalVaultDataBreacheCountByVaultID: Ref<Map<number, number>>;
    private internalFailedToLoadDataBreaches: Ref<boolean>;

    get vaultDataBreaches() { return this.internalVaultDataBreaches.value; }
    get vaultBreachesByPasswordID() { return this.internalVaultDataBreachesByPasswordID; }
    get vaultDataBreachCountByVaultID() { return this.internalVaultDataBreacheCountByVaultID.value; }
    get failedToLoadDataBreaches() { return this.internalFailedToLoadDataBreaches.value; }

    constructor()
    {
        super('vaultDataBreachStore');

        this.internalVaultDataBreaches = ref([]);
        this.internalVaultDataBreachesByPasswordID = ref(new Map());
        this.internalVaultDataBreacheCountByVaultID = ref(new Map());
        this.internalFailedToLoadDataBreaches = ref(false);
    }

    protected defaultState()
    {
        return {
            version: 0
        };
    }

    public resetToDefault(): void
    {
        this.internalVaultDataBreaches.value = [];
        this.internalVaultDataBreachesByPasswordID.value = new Map();
        this.internalVaultDataBreacheCountByVaultID.value = new Map();
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

            vault.passwordsByDomain?.forEach((v, k, map) => 
            {
                limitedPasswords = limitedPasswords.concat(v.map((kk, vv) =>
                {
                    return {
                        id: vv,
                        domain: k
                    }
                }))
            });

            vaultPostData['LimitedPasswords'] = limitedPasswords;
            postData.Vaults.push(vaultPostData);
        }

        const response = await api.server.vault.getVaultDataBreaches(JSON.vaulticStringify(postData));
        if (!response.Success)
        {
            this.internalFailedToLoadDataBreaches.value = true;
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

        this.internalFailedToLoadDataBreaches.value = false;
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
                    domain: p.domain
                }
            })
        };

        const response = await api.server.vault.checkPasswordsForBreach(JSON.vaulticStringify(checkPasswordsForBreachData));
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
                    domain: password.domain
                }]
        };

        const response = await api.server.vault.checkPasswordsForBreach(JSON.vaulticStringify(checkPasswordForBreachData));
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

        const response = await api.server.vault.dismissVaultDataBreach(app.currentVault.userOrganizationID, app.currentVault.vaultID, vaultDataBreachID);
        if (response.Success)
        {
            this.internalVaultDataBreaches.value = this.internalVaultDataBreaches.value.filter(b => b.VaultDataBreachID != vaultDataBreachID);
            this.internalVaultDataBreachesByPasswordID.value.forEach((v, k, map) =>
            {
                if (v.VaultDataBreachID == vaultDataBreachID)
                {
                    this.internalVaultDataBreachesByPasswordID.value.delete(k);
                }
            });

            const currentBreachCount = this.internalVaultDataBreacheCountByVaultID.value.get(app.currentVault.vaultID);
            if (currentBreachCount == 1)
            {
                this.internalVaultDataBreacheCountByVaultID.value.delete(app.currentVault.vaultID);
            }
            else
            {
                this.internalVaultDataBreacheCountByVaultID.value.set(app.currentVault.vaultID, currentBreachCount! - 1);
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

        vaultIDs.forEach(v =>
        {
            this.internalVaultDataBreacheCountByVaultID.value.delete(v);
            this.internalVaultDataBreaches.value = this.internalVaultDataBreaches.value.filter(b => b.VaultID != v);
            this.internalVaultDataBreachesByPasswordID.value.forEach((value, k, map) =>
            {
                if (value.VaultID == v)
                {
                    this.internalVaultDataBreachesByPasswordID.value.delete(k);
                }
            })
        });

        this.emit('onBreachesUpdated');
        return true;
    }

    // TOOD: make sure this still works after removing PasswordID as a parameter
    private setBreach(dataBreach: VaultDataBreach)
    {
        let currentBreachCount = this.internalVaultDataBreacheCountByVaultID.value.get(dataBreach.VaultID)
        if (currentBreachCount === undefined)
        {
            currentBreachCount = 1;
        }
        else
        {
            currentBreachCount += 1;
        }

        this.internalVaultDataBreaches.value.push(dataBreach);
        this.internalVaultDataBreachesByPasswordID.value.set(dataBreach.PasswordID, dataBreach);
        this.internalVaultDataBreacheCountByVaultID.value.set(dataBreach.VaultID, currentBreachCount);
    }
}

