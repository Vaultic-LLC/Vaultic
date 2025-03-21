import { ComputedRef, Ref, computed, ref } from "vue";
import createReactivePassword, { ReactivePassword } from "./ReactivePassword";
import { PrimaryDataTypeStore, PrimarydataTypeStoreStateKeys, StateKeys, StoreEvents } from "./Base";
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
import { DoubleKeyedObject, PendingStoreState, StorePathRetriever, StoreState } from "@vaultic/shared/Types/Stores";
import { OH } from "@vaultic/shared/Utilities/PropertyManagers";

export interface IPasswordStoreState extends StoreState
{
    /** Passwords By ID */
    p: { [key: string]: ReactivePassword };
    /** Passwords By Domain */
    o: DoubleKeyedObject;
    /** Duplicate Passwords */
    d: DoubleKeyedObject;
    /** Current and Safe Passwords */
    c: CurrentAndSafeStructure;
    /** Passwords By Hash */
    h: DoubleKeyedObject;
};

interface PasswordStoreStateKeys extends PrimarydataTypeStoreStateKeys
{
    'passwordsByID': '';
    'passwordsByID.password': '';
    'securityQuestions': '';
    'securityQuestions.question': '';
    'securityQuestion.answer': '';
    'passwordsByDomain': '';
    'passwordsByDomain.passwords': '';
    'currentAndSafePasswords': '';
}

const PasswordStorePathRetriever: StorePathRetriever<PasswordStoreStateKeys> =
{
    'passwordsByID': (...ids: string[]) => `p`,
    'passwordsByID.password': (...ids: string[]) => `p.${ids[0]}`,
    'securityQuestions': (...ids: string[]) => `p.${ids[0]}.q`,
    'securityQuestions.question': (...ids: string[]) => `p.${ids[0]}.q.${ids[1]}.q`,
    'securityQuestion.answer': (...ids: string[]) => `p.${ids[0]}.q.${ids[1]}.a`,
    'passwordsByDomain': (...ids: string[]) => `o`,
    'passwordsByDomain.passwords': (...ids: string[]) => `o.${ids[0]}`,
    'duplicateDataTypes': (...ids: string[]) => 'd',
    'duplicateDataTypes.dataTypes': (...ids: string[]) => `d.${ids[0]}`,
    'currentAndSafePasswords': (...ids: string[]) => 'c',
    'dataTypesByHash': (...ids: string[]) => 'h',
    'dataTypesByHash.dataTypes': (...ids: string[]) => `h.${ids[0]}`
};

export type PasswordStoreEvents = StoreEvents | "onCheckPasswordBreach" | "onCheckPasswordsForBreach";
export type PasswordStoreState = KnownMappedFields<IPasswordStoreState>;

export class PasswordStore extends PrimaryDataTypeStore<PasswordStoreState, PasswordStoreStateKeys, PasswordStoreEvents>
{
    constructor(vault: VaultStoreParameter)
    {
        super(vault, "passwordStoreState", PasswordStorePathRetriever);
    }

    protected getPrimaryDataTypesByID(state: KnownMappedFields<IPasswordStoreState>): { [key: string]: SecondaryDataObjectCollectionType }
    {
        return state.p;
    }

    protected defaultState()
    {
        return {
            version: 0,
            p: {},
            o: {},
            d: {},
            c: new CurrentAndSafeStructure(),
            h: {}
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

        app.currentVault.passwordsByDomain = this.state.o;

        // too difficult to store some state and re check all data breaches against a new password 
        if (app.isOnline)
        {
            // TODO: need to update server to take multiple passwords now instead of just one
            this.emit("onCheckPasswordsForBreach", addedPasswords);
        }

        return true;
    }

    async addPasswordToStores(masterKey: string, password: Password, pendingPasswordState: PendingStoreState<PasswordStoreState, PasswordStoreStateKeys>,
        pendingFilterStoreState: IFilterStoreState, pendingGroupStoreState: IGroupStoreState): Promise<boolean>
    {
        password.id = uniqueIDGenerator.generate();

        await this.updateValuesByHash(pendingPasswordState, "p", password, undefined);

        // doing this before adding saves us from having to remove the current password from the list of potential duplicates
        await this.checkUpdateDuplicatePrimaryObjects(masterKey, password, pendingPasswordStoreState.h, pendingPasswordStoreState.p,
            "p", pendingPasswordStoreState.d);

        if (!(await this.setPasswordProperties(masterKey, password)))
        {
            return false;
        }

        await this.updateSecurityQuestions(masterKey, password, true, [], []);

        const reactivePassword = createReactivePassword(password);
        pendingPasswordStoreState.p.set(password.id, reactivePassword);
        this.updatePasswordsByDomain(pendingPasswordStoreState, reactivePassword.id, reactivePassword.d);

        await this.incrementCurrentAndSafePasswords(pendingPasswordStoreState, pendingPasswordStoreState.p);

        // update groups before filters
        this.vault.groupStore.syncGroupsForPasswords(reactivePassword.id, new RelatedDataTypeChanges(reactivePassword.g), pendingGroupStoreState);
        this.vault.filterStore.syncFiltersForPasswords(new Map([[reactivePassword.id, reactivePassword]]), pendingGroupStoreState.p, true, pendingFilterStoreState);

        return true;
    }

    async updatePassword(masterKey: string, updatingPassword: Password, passwordWasUpdated: boolean, updatedSecurityQuestionQuestions: string[],
        updatedSecurityQuestionAnswers: string[], backup?: boolean): Promise<boolean>
    {
        backup = backup ?? app.isOnline;

        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        let currentPassword = pendingState.p.get(updatingPassword.id);
        if (!currentPassword)
        {
            await api.repositories.logs.log(undefined, `No Password`, "PasswordStore.Update")
            return false;
        }

        // TODO: Check update email on sever if isVaultic. Need to update it in my database, for stripe, and locally. Would 
        // preferably have this be the only way to update email, and not via a webhook but Idk if thats possible to prevent. Wil
        // need to look into
        if (updatingPassword.v && !app.isOnline && currentPassword.e != updatingPassword.e)
        {
            return false;
        }

        // retrieve these before updating
        const changedGroups = this.getRelatedDataTypeChanges(currentPassword.g, updatingPassword.g);

        if (passwordWasUpdated)
        {
            // Don't support updating the master key at this time, set our 'new' password to our old one
            if (updatingPassword.v)
            {
                updatingPassword.password = currentPassword.password;
            }

            await this.updateValuesByHash(pendingState.h, "p", updatingPassword, currentPassword);

            // do this before re encrypting the password
            await this.checkUpdateDuplicatePrimaryObjects(masterKey, updatingPassword, pendingState.h, pendingState.p, "p",
                pendingState.d);

            if (!(await this.setPasswordProperties(masterKey, updatingPassword)))
            {
                return false;
            }
        }
        else if (!updatingPassword.v)
        {
            this.checkUpdateDuplicatePrimaryObjectsModifiedTime(updatingPassword.id, pendingState.d);

            // need to check to see if the password contains their potentially updated username
            const decryptResponse = await cryptHelper.decrypt(masterKey, updatingPassword.password);
            if (!decryptResponse.success)
            {
                return false;
            }

            if (decryptResponse.value?.includes(updatingPassword.l))
            {
                updatingPassword.c = true;
            }
        }

        await this.updateSecurityQuestions(masterKey, updatingPassword, false, updatedSecurityQuestionQuestions, updatedSecurityQuestionAnswers);

        this.updatePasswordsByDomain(pendingState, currentPassword.id, updatingPassword.d, currentPassword.d);
        const newPassword = createReactivePassword(updatingPassword);

        // TODO: this probably doesn't work. Same with Values, filters, and groups
        currentPassword = newPassword;

        await this.incrementCurrentAndSafePasswords(pendingState, pendingState.p);

        const pendingGroupState = this.vault.groupStore.cloneState();
        this.vault.groupStore.syncGroupsForPasswords(updatingPassword.id, changedGroups, pendingGroupState);

        const pendingFilterState = this.vault.filterStore.cloneState();
        this.vault.filterStore.syncFiltersForPasswords(new Map([[currentPassword.id, currentPassword]]), pendingGroupState.p, true, pendingFilterState);

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        if (!(await transaction.commit(masterKey, backup)))
        {
            return false;
        }

        app.currentVault.passwordsByDomain = this.state.o;

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
        if (password.v)
        {
            app.popups.showAlert("Error", "Can't delete the username / password used for signing into Vaultic Services", false);
            return false;
        }

        const currentPassword = pendingState.p.get(password.id);
        if (!currentPassword)
        {
            await api.repositories.logs.log(undefined, `No Password`, "PasswordStore.Delete")
            return false;
        }

        await this.updateValuesByHash(pendingState.h, "p", undefined, currentPassword);

        this.checkRemoveFromDuplicate(password, pendingState.d);
        pendingState.p.delete(currentPassword.id);
        this.updatePasswordsByDomain(pendingState, currentPassword.id, undefined, currentPassword.d);

        await this.incrementCurrentAndSafePasswords(pendingState, pendingState.p);

        const pendingGroupState = this.vault.groupStore.cloneState();
        this.vault.groupStore.syncGroupsForPasswords(password.id, new RelatedDataTypeChanges(undefined, password.g, undefined), pendingGroupState);

        const pendingFilterState = this.vault.filterStore.cloneState();
        this.vault.filterStore.removePasswordFromFilters(password.id, pendingFilterState);

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        if (!(await transaction.commit(masterKey)))
        {
            return false;
        }

        app.currentVault.passwordsByDomain = this.state.o;
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
            if (!pendingState.o.has(newDomain))
            {
                pendingState.o[newDomain] = {};
            }

            pendingState.o[newDomain][id] = true;
        }

        if (oldDomain && newDomain != oldDomain)
        {
            if (!pendingState.o.has(oldDomain))
            {
                return;
            }

            delete pendingState.o[oldDomain][id];
        }
    }

    private async incrementCurrentAndSafePasswords(pendingState: PasswordStoreState, passwords: { [key: string]: ReactivePassword })
    {
        const id = uniqueIDGenerator.generate();
        pendingState.c.c.set(id, passwords.size);

        const safePasswords = passwords.filter((k, v) => this.passwordIsSafe(pendingState, v));
        pendingState.c.s.set(id, safePasswords.size);
    }

    private passwordIsSafe(state: PasswordStoreState, password: ReactivePassword)
    {
        return !password.isOld() && !password.c && !password.w && !state.d.has(password.id);
    }

    private async setPasswordProperties(masterKey: string, password: Password): Promise<boolean>
    {
        if (!password.v)
        {
            password.t = new Date().getTime().toString();

            const [isWeak, isWeakMessage] = await api.helpers.validation.isWeak(password.p);
            password.w = isWeak;
            password.m = isWeakMessage;

            password.c = password.p.includes(password.l);
        }

        const response = await cryptHelper.encrypt(masterKey, password.p);
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

        // TODO: these will have to be set differently to get working with the new change tracking
        // currently they are always updated here, even when they were just added. In that case
        // we would only want a change tracking for Add, and not any for

        if (updateAllSecurityQuestions)
        {
            for (const [key, value] of password.q.entries())
            {
                await updateSecurityQuestionQuestion(masterKey, value);
                await updateSecurityQuestionnAnswer(masterKey, value);
            }
        }
        else
        {
            for (let i = 0; i < updatedSecurityQuestionQuestions.length; i++)
            {
                let sq = password.q.get(updatedSecurityQuestionQuestions[i]);
                if (!sq)
                {
                    continue;
                }

                await updateSecurityQuestionQuestion(masterKey, sq);
            }

            for (let i = 0; i < updatedSecurityQuestionAnswers.length; i++)
            {
                let sq = password.q.get(updatedSecurityQuestionAnswers[i]);
                if (!sq)
                {
                    continue;
                }

                await updateSecurityQuestionnAnswer(masterKey, sq);
            }
        }

        async function updateSecurityQuestionQuestion(masterKey: string, securityQuestion: SecurityQuestion)
        {
            securityQuestion.q = (await cryptHelper.encrypt(masterKey, securityQuestion.q)).value ?? "";
        }

        async function updateSecurityQuestionnAnswer(masterKey: string, securityQuestion: SecurityQuestion)
        {
            securityQuestion.a = ((await cryptHelper.encrypt(masterKey, securityQuestion.a)).value ?? "");
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
    get passwordsByID() { return this.state.p; }
    get oldPasswords() { return this.internalOldPasswords }
    get weakPasswords() { return this.internalWeakPasswords }
    get containsLoginPasswords() { return this.internalContainsLoginPasswords }
    get duplicatePasswords() { return this.state.d; }
    get currentAndSafePasswordsCurrent() { return this.internalCurrentAndSafePasswordsCurrent.value; }
    get currentAndSafePasswordsSafe() { return this.internalCurrentAndSafePasswordsSafe.value; }
    get activeAtRiskPasswordType() { return this.internalActiveAtRiskPasswordType.value; }
    get breachedPasswords() { return this.internalBreachedPasswords.value; }

    constructor(vault: any)
    {
        super(vault);

        this.internalPasswords = computed(() => Object.values(this.state.p));

        this.internalOldPasswords = computed(() => OH.mapWhere(this.state.p, (v) => v.isOld(), (v) => v.id));
        this.internalWeakPasswords = computed(() => OH.mapWhere(this.state.p, (v) => v.w, (v) => v.id));
        this.internalContainsLoginPasswords = computed(() => OH.mapWhere(this.state.p, v => v.c, v => v.id));

        this.internalCurrentAndSafePasswordsCurrent = computed(() => this.state.c.c.map((k, v) => v));
        this.internalCurrentAndSafePasswordsSafe = computed(() => this.state.c.s.map((k, v) => v));

        this.internalActiveAtRiskPasswordType = ref(AtRiskType.None);

        this.internalBreachedPasswords = computed(() => !app.vaultDataBreaches.vaultDataBreaches ? [] :
            this.passwords.filter(p => app.vaultDataBreaches.vaultDataBreaches.filter(b => b.PasswordID == p.id).length > 0).map(p => p.id));
    }

    protected preAssignState(state: PasswordStoreState): void 
    {
        for (const [key, value] of Object.entries(state.p))
        {
            state.p[key] = createReactivePassword(value);
        }
    }

    protected getPasswordAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskPasswordType;
    }
}
