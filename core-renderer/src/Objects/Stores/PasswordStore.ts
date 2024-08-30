import { Password, CurrentAndSafeStructure, AtRiskType } from "../../Types/EncryptedData";
import { ComputedRef, Ref, computed, ref } from "vue";
import createReactivePassword, { ReactivePassword } from "./ReactivePassword";
import { Dictionary } from "../../Types/DataStructures";
import { PrimaryDataObjectStore, DataTypeStoreState } from "./Base";
import { generateUniqueID } from "../../Helpers/generatorHelper";
import cryptHelper from "../../Helpers/cryptHelper";
import { api } from "../../API";
import StoreUpdateTransaction, { Entity } from "../StoreUpdateTransaction";
import { DataType } from "../../Types/Table";
import app from "./AppStore";
import { VaultStoreParameter } from "./VaultStore";

export interface PasswordStoreState extends DataTypeStoreState<ReactivePassword>
{
    duplicatePasswords: Dictionary<string[]>;
    currentAndSafePasswords: CurrentAndSafeStructure;
}

export class PasswordStore extends PrimaryDataObjectStore<ReactivePassword, PasswordStoreState>
{
    constructor(vault: VaultStoreParameter)
    {
        super(vault, "passwordStoreState");
    }

    protected defaultState()
    {
        return {
            version: 0,
            hash: "",
            hashSalt: "",
            values: [],
            duplicatePasswords: {},
            currentAndSafePasswords: { current: [], safe: [] },
        }
    }

    async addPassword(masterKey: string, password: Password, skipBackup: boolean = false): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(Entity.Vault, this.vault.vaultID);
        const pendingState: PasswordStoreState = this.cloneState();

        password.id = await generateUniqueID(pendingState.values);

        // doing this before adding saves us from having to remove the current password from the list of potential duplicates
        await this.checkUpdateDuplicatePrimaryObjects(masterKey, password, pendingState.values, "password", pendingState.duplicatePasswords);

        if (!(await this.setPasswordProperties(masterKey, password)))
        {
            return false;
        }

        await this.updateSecurityQuestions(masterKey, password, true, [], []);

        const reactivePassword = createReactivePassword(password);
        pendingState.values.push(reactivePassword);
        this.incrementCurrentAndSafePasswords(pendingState);

        // update groups before filters
        const pendingGroupState = this.vault.groupStore.syncGroupsForPasswords(reactivePassword.id, reactivePassword.groups, []);
        const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords([reactivePassword],
            pendingGroupState.values.filter(g => g.type == DataType.Passwords));

        transaction.addStore(this, pendingState);
        transaction.addStore(this.vault.groupStore, pendingGroupState);
        transaction.addStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey, skipBackup);
    }

    async updatePassword(masterKey: string, updatingPassword: Password, passwordWasUpdated: boolean, updatedSecurityQuestionQuestions: string[],
        updatedSecurityQuestionAnswers: string[]): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(Entity.Vault, this.vault.vaultID);
        const pendingState = this.cloneState();

        const passwordIndex = pendingState.values.findIndex(p => p.id == updatingPassword.id);
        if (passwordIndex < 0)
        {
            return false;
        }

        // TODO: Check update email on sever if isVaultic
        if (updatingPassword.isVaultic && !app.isOnline)
        {
            return false;
        }

        const currentPassword = pendingState.values[passwordIndex];

        // retrieve these before updating
        const addedGroups = updatingPassword.groups.filter(g => !currentPassword.groups.includes(g));
        const removedGroups = currentPassword.groups.filter(g => !updatingPassword.groups.includes(g));

        if (passwordWasUpdated)
        {
            if (updatingPassword.isVaultic)
            {
                // we don't allow storing their master key
                updatingPassword.password = "";
            }

            // do this before re encrypting the password
            await this.checkUpdateDuplicatePrimaryObjects(masterKey, updatingPassword,
                pendingState.values.filter(p => p.id != updatingPassword.id), "password", pendingState.duplicatePasswords);

            if (!(await this.setPasswordProperties(masterKey, updatingPassword)))
            {
                return false;
            }
        }
        else if (!updatingPassword.isVaultic)
        {
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

        const newPassword = createReactivePassword(updatingPassword);
        pendingState.values[passwordIndex] = newPassword;

        this.incrementCurrentAndSafePasswords(pendingState);

        const pendingGroupState = this.vault.groupStore.syncGroupsForPasswords(updatingPassword.id, addedGroups, removedGroups);
        const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords([updatingPassword],
            pendingGroupState.values.filter(g => g.type == DataType.Passwords));

        transaction.addStore(this, pendingState);
        transaction.addStore(this.vault.groupStore, pendingGroupState);
        transaction.addStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey);
    }

    async deletePassword(masterKey: string, password: ReactivePassword): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(Entity.Vault, this.vault.vaultID);
        const pendingState = this.cloneState();

        if (password.isVaultic)
        {
            app.popups.showAlert("Error", "Can't delete the username / password used for signing into Vaultic Services", false);
            return false;
        }

        const passwordIndex = pendingState.values.findIndex(p => p.id == password.id);
        if (passwordIndex < 0)
        {
            return false;
        }

        this.checkRemoveFromDuplicate(password, pendingState.duplicatePasswords);
        pendingState.values.splice(passwordIndex, 1);
        this.incrementCurrentAndSafePasswords(pendingState);

        const pendingGroupState = this.vault.groupStore.syncGroupsForPasswords(password.id, [], password.groups);
        const pendingFilterState = this.vault.filterStore.removePasswordFromFilters(password.id);

        transaction.addStore(this, pendingState);
        transaction.addStore(this.vault.groupStore, pendingGroupState);
        transaction.addStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey);
    }

    private incrementCurrentAndSafePasswords(pendingState: PasswordStoreState)
    {
        pendingState.currentAndSafePasswords.current.push(pendingState.values.length);

        const safePasswords = pendingState.values.filter(
            p => !p.isWeak && !pendingState.duplicatePasswords[p.id] && !p.containsLogin && !p.isOld);

        pendingState.currentAndSafePasswords.safe.push(safePasswords.length);
    }

    private async setPasswordProperties(masterKey: string, password: Password): Promise<boolean>
    {
        if (!password.isVaultic)
        {
            password.passwordLength = password.password.length;
            password.lastModifiedTime = new Date().getTime().toString();

            const [isWeak, isWeakMessage] = await api.helpers.validation.isWeak(password.password, "Password");
            password.isWeak = isWeak;
            password.isWeakMessage = isWeakMessage;

            password.containsLogin = password.password.includes(password.login);

            const response = await cryptHelper.encrypt(masterKey, password.password);
            if (!response)
            {
                return false;
            }
            else
            {
                password.password = response.value!;
            }
        }

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
            for (let i = 0; i < password.securityQuestions.length; i++)
            {
                await updateSecurityQuestionQuestion(masterKey, password, i);
                await updateSecurityQuestionnAnswer(masterKey, password, i);
            }
        }
        else
        {
            for (let i = 0; i < updatedSecurityQuestionQuestions.length; i++)
            {
                let sq = password.securityQuestions.filter(q => q.id == updatedSecurityQuestionQuestions[i]);
                if (sq.length != 1)
                {
                    continue;
                }

                await updateSecurityQuestionQuestion(masterKey, password, i);
            }

            for (let i = 0; i < updatedSecurityQuestionAnswers.length; i++)
            {
                let sq = password.securityQuestions.filter(q => q.id == updatedSecurityQuestionAnswers[i]);
                if (sq.length != 1)
                {
                    continue;
                }

                await updateSecurityQuestionnAnswer(masterKey, password, i);
            }
        }

        async function updateSecurityQuestionQuestion(masterKey: string, password: Password, index: number)
        {
            password.securityQuestions[index].questionLength = password.securityQuestions[index].question.length;
            password.securityQuestions[index].question = (await cryptHelper.encrypt(masterKey, password.securityQuestions[index].question)).value ?? "";
        }

        async function updateSecurityQuestionnAnswer(masterKey: string, password: Password, index: number)
        {
            password.securityQuestions[index].answerLength = password.securityQuestions[index].answer.length;
            password.securityQuestions[index].answer = ((await cryptHelper.encrypt(masterKey, password.securityQuestions[index].answer)).value ?? "");
        }
    }
}

export class ReactivePasswordStore extends PasswordStore
{
    private internalOldPasswords: ComputedRef<string[]>;
    private internalWeakPasswords: ComputedRef<string[]>;

    private internalContainsLoginPasswords: ComputedRef<string[]>;
    private internalDuplicatePasswords: ComputedRef<string[]>;

    private internalDuplicatePasswordsLength: ComputedRef<number>;
    private internalPinnedPasswords: ComputedRef<ReactivePassword[]>;
    private internalUnpinnedPasswords: ComputedRef<ReactivePassword[]>;

    private internalActiveAtRiskPasswordType: Ref<AtRiskType>;
    private internalHasVaulticPassword: ComputedRef<boolean>;

    private internalBreachedPasswords: ComputedRef<string[]>;

    get passwords() { return this.state.values; }
    get pinnedPasswords() { return this.internalPinnedPasswords.value; }
    get unpinnedPasswords() { return this.internalUnpinnedPasswords.value; }
    get oldPasswords() { return this.internalOldPasswords }
    get weakPasswords() { return this.internalWeakPasswords }
    get containsLoginPasswords() { return this.internalContainsLoginPasswords }
    get duplicatePasswords() { return this.internalDuplicatePasswords }
    get duplicatePasswordsLength() { return this.internalDuplicatePasswordsLength.value; }
    get currentAndSafePasswords() { return this.state.currentAndSafePasswords; }
    get activeAtRiskPasswordType() { return this.internalActiveAtRiskPasswordType.value; }
    get hasVaulticPassword() { return this.internalHasVaulticPassword.value; }
    get breachedPasswords() { return this.internalBreachedPasswords.value; }

    constructor(vault: any)
    {
        super(vault);

        this.internalOldPasswords = computed(() => this.state.values.filter(p => p.isOld).map(p => p.id));
        this.internalWeakPasswords = computed(() => this.state.values.filter(p => p.isWeak).map(p => p.id));

        this.internalContainsLoginPasswords = computed(() => this.state.values.filter(p => p.containsLogin).map(p => p.id));
        this.internalDuplicatePasswords = computed(() => Object.keys(this.state.duplicatePasswords));

        this.internalDuplicatePasswordsLength = computed(() => Object.keys(this.state.duplicatePasswords).length);
        this.internalPinnedPasswords = computed(() => this.state.values.filter(p => this.vault.vaultPreferencesStore.pinnedPasswords.hasOwnProperty(p.id)));
        this.internalUnpinnedPasswords = computed(() => this.state.values.filter(p => !this.vault.vaultPreferencesStore.pinnedPasswords.hasOwnProperty(p.id)));

        this.internalActiveAtRiskPasswordType = ref(AtRiskType.None);
        this.internalHasVaulticPassword = computed(() => this.state.values.filter(p => p.isVaultic).length > 0);

        this.internalBreachedPasswords = computed(() => !app.userDataBreaches.userDataBreaches ? [] :
            this.state.values.filter(p => app.userDataBreaches.userDataBreaches.filter(b => b.PasswordID == p.id).length > 0).map(p => p.id));
    }

    protected postAssignState(state: PasswordStoreState): void 
    {
        for (let i = 0; i < state.values.length; i++)
        {
            state.values[i] = createReactivePassword(state.values[i]);
        }
    }

    protected getPasswordAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskPasswordType;
    }
}
