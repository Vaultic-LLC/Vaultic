import { ComputedRef, Ref, computed, ref } from "vue";
import createReactivePassword, { ReactivePassword } from "./ReactivePassword";
import { PrimaryDataTypeStore, StoreEvents, StoreState } from "./Base";
import cryptHelper from "../../Helpers/cryptHelper";
import { api } from "../../API";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import app from "./AppStore";
import { VaultStoreParameter } from "./VaultStore";
import { AtRiskType, CurrentAndSafeStructure, Password, RelatedDataTypeChanges, SecurityQuestion } from "../../Types/DataTypes";
import { KnownMappedFields, SecondaryDataObjectCollectionType } from "@vaultic/shared/Types/Fields";
import { uniqueIDGenerator } from "@vaultic/shared/Utilities/UniqueIDGenerator";
import { IFilterStoreState } from "./FilterStore";
import { IGroupStoreState } from "./GroupStore";

export interface IPasswordStoreState extends StoreState
{
    passwordsByID: Map<string, ReactivePassword>;
    passwordsByDomain: Map<string, Map<string, string>>;
    duplicatePasswords: Map<string, Map<string, string>>;
    currentAndSafePasswords: CurrentAndSafeStructure;
    passwordsByHash: Map<string, Map<string, string>>;
};

export type PasswordStoreEvents = StoreEvents | "onCheckPasswordBreach" | "onCheckPasswordsForBreach";
export type PasswordStoreState = KnownMappedFields<IPasswordStoreState>;

export class PasswordStore extends PrimaryDataTypeStore<PasswordStoreState, PasswordStoreEvents>
{
    constructor(vault: VaultStoreParameter)
    {
        super(vault, "passwordStoreState");
    }

    protected getPrimaryDataTypesByID(state: KnownMappedFields<IPasswordStoreState>): Map<string, SecondaryDataObjectCollectionType>
    {
        return state.passwordsByID;
    }

    protected defaultState()
    {
        return {
            version: 0,
            passwordsByID: new Map<string, ReactivePassword>(),
            passwordsByDomain: new Map<string, Map<string, string>>(),
            duplicatePasswords: new Map<string, Map<string, string>>(),
            currentAndSafePasswords: new CurrentAndSafeStructure(),
            passwordsByHash: new Map<string, Map<string, string>>()
        };
    }

    async addPassword(masterKey: string, password: Password, backup?: boolean): Promise<boolean>
    {
        const passwordStoreState = this.cloneState();
        const filterStoreState = app.currentVault.filterStore.cloneState();
        const groupStoreState = app.currentVault.groupStore.cloneState();

        if (!await this.addPasswordToStores(masterKey, password, passwordStoreState, filterStoreState, groupStoreState))
        {
            return false;
        }

        return await this.commitPasswordEdits(masterKey, [password], passwordStoreState, filterStoreState, groupStoreState, backup);
    }

    async commitPasswordEdits(masterKey: string, addedPasswords: Password[], pendingPasswordStoreState: IPasswordStoreState, pendingFilterStoreState: IFilterStoreState,
        pendingGroupStoreState: IGroupStoreState, backup?: boolean): Promise<boolean>
    {
        backup = backup ?? app.isOnline;

        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);

        transaction.updateVaultStore(this, pendingPasswordStoreState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupStoreState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterStoreState);

        if (!(await transaction.commit(masterKey, backup)))
        {
            return false;
        }

        app.currentVault.passwordsByDomain = this.state.passwordsByDomain;

        // too difficult to store some state and re check all data breaches against a new password 
        if (app.isOnline)
        {
            // TODO: need to update server to take multiple passwords now instead of just one
            this.emit("onCheckPasswordsForBreach", addedPasswords);
        }

        return true;
    }

    async addPasswordToStores(masterKey: string, password: Password, pendingPasswordStoreState: IPasswordStoreState, pendingFilterStoreState: IFilterStoreState,
        pendingGroupStoreState: IGroupStoreState): Promise<boolean>
    {
        password.id = uniqueIDGenerator.generate();

        await this.updateValuesByHash(pendingPasswordStoreState.passwordsByHash, "password", password, undefined);

        // doing this before adding saves us from having to remove the current password from the list of potential duplicates
        await this.checkUpdateDuplicatePrimaryObjects(masterKey, password, pendingPasswordStoreState.passwordsByHash, pendingPasswordStoreState.passwordsByID,
            "password", pendingPasswordStoreState.duplicatePasswords);

        if (!(await this.setPasswordProperties(masterKey, password)))
        {
            return false;
        }

        await this.updateSecurityQuestions(masterKey, password, true, [], []);

        const reactivePassword = createReactivePassword(password);
        pendingPasswordStoreState.passwordsByID.set(password.id, reactivePassword);
        this.updatePasswordsByDomain(pendingPasswordStoreState, reactivePassword.id, reactivePassword.domain);

        await this.incrementCurrentAndSafePasswords(pendingPasswordStoreState, pendingPasswordStoreState.passwordsByID);

        // update groups before filters
        this.vault.groupStore.syncGroupsForPasswords(reactivePassword.id, new RelatedDataTypeChanges(reactivePassword.groups), pendingGroupStoreState);
        this.vault.filterStore.syncFiltersForPasswords(new Map([[reactivePassword.id, reactivePassword]]), pendingGroupStoreState.passwordGroupsByID, true, pendingFilterStoreState);

        return true;
    }

    async updatePassword(masterKey: string, updatingPassword: Password, passwordWasUpdated: boolean, updatedSecurityQuestionQuestions: string[],
        updatedSecurityQuestionAnswers: string[], backup?: boolean): Promise<boolean>
    {
        backup = backup ?? app.isOnline;

        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        let currentPassword = pendingState.passwordsByID.get(updatingPassword.id);
        if (!currentPassword)
        {
            await api.repositories.logs.log(undefined, `No Password`, "PasswordStore.Update")
            return false;
        }

        // TODO: Check update email on sever if isVaultic. Need to update it in my database, for stripe, and locally. Would 
        // preferably have this be the only way to update email, and not via a webhook but Idk if thats possible to prevent. Wil
        // need to look into
        if (updatingPassword.isVaultic && !app.isOnline && currentPassword.email != updatingPassword.email)
        {
            return false;
        }

        // retrieve these before updating
        const changedGroups = this.getRelatedDataTypeChanges(currentPassword.groups, updatingPassword.groups);

        if (passwordWasUpdated)
        {
            // Don't support updating the master key at this time, set our 'new' password to our old one
            if (updatingPassword.isVaultic)
            {
                updatingPassword.password = currentPassword.password;
            }

            await this.updateValuesByHash(pendingState.passwordsByHash, "password", updatingPassword, currentPassword);

            // do this before re encrypting the password
            await this.checkUpdateDuplicatePrimaryObjects(masterKey, updatingPassword, pendingState.passwordsByHash, pendingState.passwordsByID, "password",
                pendingState.duplicatePasswords);

            if (!(await this.setPasswordProperties(masterKey, updatingPassword)))
            {
                return false;
            }
        }
        else if (!updatingPassword.isVaultic)
        {
            this.checkUpdateDuplicatePrimaryObjectsModifiedTime(updatingPassword.id, pendingState.duplicatePasswords);

            // need to check to see if the password contains their potentially updated username
            const decryptResponse = await cryptHelper.decrypt(masterKey, updatingPassword.password);
            if (!decryptResponse.success)
            {
                return false;
            }

            if (decryptResponse.value?.includes(updatingPassword.login))
            {
                updatingPassword.containsLogin = true;
            }
        }

        await this.updateSecurityQuestions(masterKey, updatingPassword, false, updatedSecurityQuestionQuestions, updatedSecurityQuestionAnswers);

        this.updatePasswordsByDomain(pendingState, currentPassword.id, updatingPassword.domain, currentPassword.domain);
        const newPassword = createReactivePassword(updatingPassword);

        // TODO: this probably doesn't work. Same with Values, filters, and groups
        currentPassword = newPassword;

        await this.incrementCurrentAndSafePasswords(pendingState, pendingState.passwordsByID);

        const pendingGroupState = this.vault.groupStore.cloneState();
        this.vault.groupStore.syncGroupsForPasswords(updatingPassword.id, changedGroups, pendingGroupState);

        const pendingFilterState = this.vault.filterStore.cloneState();
        this.vault.filterStore.syncFiltersForPasswords(new Map([[currentPassword.id, currentPassword]]), pendingGroupState.passwordGroupsByID, true, pendingFilterState);

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        if (!(await transaction.commit(masterKey, backup)))
        {
            return false;
        }

        app.currentVault.passwordsByDomain = this.state.passwordsByDomain;

        if (app.isOnline)
        {
            this.emit("onCheckPasswordBreach", currentPassword);
        }

        return true;
    }

    async deletePassword(masterKey: string, password: ReactivePassword): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        // TODO: should just hide the delete button for the vaultic password? Is this even needed anymore? 
        // Can users update their email another way, like via stripe and then I have a webhook for that?
        if (password.isVaultic)
        {
            app.popups.showAlert("Error", "Can't delete the username / password used for signing into Vaultic Services", false);
            return false;
        }

        const currentPassword = pendingState.passwordsByID.get(password.id);
        if (!currentPassword)
        {
            await api.repositories.logs.log(undefined, `No Password`, "PasswordStore.Delete")
            return false;
        }

        await this.updateValuesByHash(pendingState.passwordsByHash, "password", undefined, currentPassword);

        this.checkRemoveFromDuplicate(password, pendingState.duplicatePasswords);
        pendingState.passwordsByID.delete(currentPassword.id);
        this.updatePasswordsByDomain(pendingState, currentPassword.id, undefined, currentPassword.domain);

        await this.incrementCurrentAndSafePasswords(pendingState, pendingState.passwordsByID);

        const pendingGroupState = this.vault.groupStore.cloneState();
        this.vault.groupStore.syncGroupsForPasswords(password.id, new RelatedDataTypeChanges(undefined, password.groups, undefined), pendingGroupState);

        const pendingFilterState = this.vault.filterStore.cloneState();
        this.vault.filterStore.removePasswordFromFilters(password.id, pendingFilterState);

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        if (!(await transaction.commit(masterKey)))
        {
            return false;
        }

        app.currentVault.passwordsByDomain = this.state.passwordsByDomain;
        return true;
    }

    private updatePasswordsByDomain(pendingState: PasswordStoreState, id: string, newDomain?: string, oldDomain?: string)
    {
        if (newDomain === oldDomain)
        {
            return;
        }

        if (newDomain)
        {
            if (!pendingState.passwordsByDomain.has(newDomain))
            {
                pendingState.passwordsByDomain.set(newDomain, new Map());
            }

            pendingState.passwordsByDomain.get(newDomain)?.set(id, id);
        }

        if (oldDomain && newDomain != oldDomain)
        {
            if (!pendingState.passwordsByDomain.has(oldDomain))
            {
                return;
            }

            pendingState.passwordsByDomain.get(oldDomain)?.delete(id);
        }
    }

    private async incrementCurrentAndSafePasswords(pendingState: PasswordStoreState, passwords: Map<string, ReactivePassword>)
    {
        const id = uniqueIDGenerator.generate();
        pendingState.currentAndSafePasswords.current.set(id, passwords.size);

        const safePasswords = passwords.filter((k, v) => this.passwordIsSafe(pendingState, v));
        pendingState.currentAndSafePasswords.safe.set(id, safePasswords.size);
    }

    private passwordIsSafe(state: PasswordStoreState, password: ReactivePassword)
    {
        return !password.isOld() && !password.containsLogin && !password.isWeak && !state.duplicatePasswords.has(password.id);
    }

    private async setPasswordProperties(masterKey: string, password: Password): Promise<boolean>
    {
        if (!password.isVaultic)
        {
            password.lastModifiedTime = new Date().getTime().toString();

            const [isWeak, isWeakMessage] = await api.helpers.validation.isWeak(password.password);
            password.isWeak = isWeak;
            password.isWeakMessage = isWeakMessage;

            password.containsLogin = password.password.includes(password.login);
        }

        const response = await cryptHelper.encrypt(masterKey, password.password);
        if (!response)
        {
            return false;
        }

        password.password = response.value!;
        return true;
    }

    private async updateSecurityQuestions(
        masterKey: string,
        password: Password,
        updateAllSecurityQuestions: boolean,
        updatedSecurityQuestionQuestions: string[],
        updatedSecurityQuestionAnswers: string[])
    {
        if (updateAllSecurityQuestions)
        {
            for (const [key, value] of password.securityQuestions.entries())
            {
                await updateSecurityQuestionQuestion(masterKey, value);
                await updateSecurityQuestionnAnswer(masterKey, value);
            }
        }
        else
        {
            for (let i = 0; i < updatedSecurityQuestionQuestions.length; i++)
            {
                let sq = password.securityQuestions.get(updatedSecurityQuestionQuestions[i]);
                if (!sq)
                {
                    continue;
                }

                await updateSecurityQuestionQuestion(masterKey, sq);
            }

            for (let i = 0; i < updatedSecurityQuestionAnswers.length; i++)
            {
                let sq = password.securityQuestions.get(updatedSecurityQuestionAnswers[i]);
                if (!sq)
                {
                    continue;
                }

                await updateSecurityQuestionnAnswer(masterKey, sq);
            }
        }

        async function updateSecurityQuestionQuestion(masterKey: string, securityQuestion: SecurityQuestion)
        {
            securityQuestion.question = (await cryptHelper.encrypt(masterKey, securityQuestion.question)).value ?? "";
        }

        async function updateSecurityQuestionnAnswer(masterKey: string, securityQuestion: SecurityQuestion)
        {
            securityQuestion.answer = ((await cryptHelper.encrypt(masterKey, securityQuestion.answer)).value ?? "");
        }
    }
}

export class ReactivePasswordStore extends PasswordStore
{
    private internalPasswords: ComputedRef<ReactivePassword[]>;

    private internalOldPasswords: ComputedRef<string[]>;
    private internalWeakPasswords: ComputedRef<string[]>;
    private internalContainsLoginPasswords: ComputedRef<string[]>;

    private internalCurrentAndSafePasswordsCurrent: ComputedRef<number[]>;
    private internalCurrentAndSafePasswordsSafe: ComputedRef<number[]>;

    private internalActiveAtRiskPasswordType: Ref<AtRiskType>;

    private internalBreachedPasswords: ComputedRef<string[]>;

    get passwords() { return this.internalPasswords.value; }
    get passwordsByID() { return this.state.passwordsByID; }
    get oldPasswords() { return this.internalOldPasswords }
    get weakPasswords() { return this.internalWeakPasswords }
    get containsLoginPasswords() { return this.internalContainsLoginPasswords }
    get duplicatePasswords() { return this.state.duplicatePasswords; }
    get currentAndSafePasswordsCurrent() { return this.internalCurrentAndSafePasswordsCurrent.value; }
    get currentAndSafePasswordsSafe() { return this.internalCurrentAndSafePasswordsSafe.value; }
    get activeAtRiskPasswordType() { return this.internalActiveAtRiskPasswordType.value; }
    get breachedPasswords() { return this.internalBreachedPasswords.value; }

    constructor(vault: any)
    {
        super(vault);

        this.internalPasswords = computed(() => this.state.passwordsByID.valueArray());

        this.internalOldPasswords = computed(() => this.state.passwordsByID.mapWhere((k, v) => v.isOld(), (k, v) => v.id));
        this.internalWeakPasswords = computed(() => this.state.passwordsByID.mapWhere((k, v) => v.isWeak, (k, v) => v.id));
        this.internalContainsLoginPasswords = computed(() => this.state.passwordsByID.mapWhere((k, v) => v.containsLogin, (k, v) => v.id));

        this.internalCurrentAndSafePasswordsCurrent = computed(() => this.state.currentAndSafePasswords.current.map((k, v) => v));
        this.internalCurrentAndSafePasswordsSafe = computed(() => this.state.currentAndSafePasswords.safe.map((k, v) => v));

        this.internalActiveAtRiskPasswordType = ref(AtRiskType.None);

        this.internalBreachedPasswords = computed(() => !app.vaultDataBreaches.vaultDataBreaches ? [] :
            this.passwords.filter(p => app.vaultDataBreaches.vaultDataBreaches.filter(b => b.PasswordID == p.id).length > 0).map(p => p.id));
    }

    protected preAssignState(state: PasswordStoreState): void 
    {
        for (const [key, value] of state.passwordsByID.entries())
        {
            state.passwordsByID.set(key, createReactivePassword(value));
        }
    }

    protected getPasswordAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskPasswordType;
    }
}
