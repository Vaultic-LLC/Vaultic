import { ComputedRef, Ref, computed, ref } from "vue";
import createReactivePassword, { ReactivePassword } from "./ReactivePassword";
import { PrimaryDataTypeStore, DataTypeStoreState } from "./Base";
import { generateUniqueID } from "../../Helpers/generatorHelper";
import cryptHelper from "../../Helpers/cryptHelper";
import { api } from "../../API";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import app from "./AppStore";
import { VaultStoreParameter } from "./VaultStore";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { AtRiskType, CurrentAndSafeStructure, DataType, Password } from "../../Types/DataTypes";

export interface PasswordStoreState extends DataTypeStoreState<ReactivePassword>
{
    duplicatePasswords: Dictionary<string[]>;
    currentAndSafePasswords: CurrentAndSafeStructure;
}

export class PasswordStore extends PrimaryDataTypeStore<ReactivePassword, PasswordStoreState>
{
    constructor(vault: VaultStoreParameter)
    {
        super(vault, "passwordStoreState");
    }

    protected defaultState()
    {
        return {
            dataTypesByID: {},
            duplicatePasswords: {},
            currentAndSafePasswords: { current: [], safe: [] },
        }
    }

    async addPassword(masterKey: string, password: Password, backup?: boolean): Promise<boolean>
    {
        backup = backup ?? app.isOnline;

        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState: PasswordStoreState = this.cloneState();
        const passwords = Object.values(pendingState.dataTypesByID);

        password.id.value = await generateUniqueID(passwords);

        // doing this before adding saves us from having to remove the current password from the list of potential duplicates
        await this.checkUpdateDuplicatePrimaryObjects(masterKey, password, passwords, "password", pendingState.duplicatePasswords);

        if (!(await this.setPasswordProperties(masterKey, password)))
        {
            return false;
        }

        await this.updateSecurityQuestions(masterKey, password, true, [], []);

        const reactivePassword = createReactivePassword(password);
        pendingState.dataTypesByID[password.id.value] = reactivePassword;

        // add to temp list since we built the list before adding it to dataTypesByID
        passwords.push(reactivePassword);
        this.incrementCurrentAndSafePasswords(pendingState, passwords);

        // update groups before filters
        const pendingGroupState = this.vault.groupStore.syncGroupsForPasswords(reactivePassword.id.value, reactivePassword.groups.value, []);
        const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords([reactivePassword],
            Object.values(pendingGroupState.dataTypesByID).filter(g => g.type.value == DataType.Passwords));

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey, backup);
    }

    async updatePassword(masterKey: string, updatingPassword: Password, passwordWasUpdated: boolean, updatedSecurityQuestionQuestions: string[],
        updatedSecurityQuestionAnswers: string[]): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        const currentPassword = pendingState.dataTypesByID[updatingPassword.id.value];
        if (!currentPassword)
        {
            await api.repositories.logs.log(undefined, `No Password`, "PasswordStore.Update")
            return false;
        }

        const passwords = Object.values(pendingState.dataTypesByID);

        // TODO: Check update email on sever if isVaultic
        if (updatingPassword.isVaultic.value && !app.isOnline)
        {
            return false;
        }

        // retrieve these before updating
        const addedGroups = updatingPassword.groups.value.filter(g => !currentPassword.groups.value.includes(g));
        const removedGroups = currentPassword.groups.value.filter(g => !updatingPassword.groups.value.includes(g));

        if (passwordWasUpdated)
        {
            // Don't support updating the master key at this time, set our 'new' password to our old one
            if (updatingPassword.isVaultic.value)
            {
                updatingPassword.password.value = currentPassword.password.value;
            }

            // do this before re encrypting the password
            await this.checkUpdateDuplicatePrimaryObjects(masterKey, updatingPassword,
                passwords.filter(p => p.id != updatingPassword.id), "password", pendingState.duplicatePasswords);

            if (!(await this.setPasswordProperties(masterKey, updatingPassword)))
            {
                return false;
            }
        }
        else if (!updatingPassword.isVaultic.value)
        {
            // need to check to see if the password contains their potentially updated username
            const decryptResponse = await cryptHelper.decrypt(masterKey, updatingPassword.password.value);
            if (!decryptResponse.success)
            {
                return false;
            }

            if (decryptResponse.value?.includes(updatingPassword.login.value))
            {
                updatingPassword.containsLogin.value = true;
            }
        }

        await this.updateSecurityQuestions(masterKey, updatingPassword, false, updatedSecurityQuestionQuestions, updatedSecurityQuestionAnswers);

        // TODO: Breaks field reactivity. Is this an issue since I re setup reactivity on the edit views?
        const newPassword = createReactivePassword(updatingPassword);
        pendingState.dataTypesByID[newPassword.id.value] = newPassword;

        this.incrementCurrentAndSafePasswords(pendingState, passwords);

        const pendingGroupState = this.vault.groupStore.syncGroupsForPasswords(updatingPassword.id.value, addedGroups, removedGroups);
        const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords([updatingPassword],
            Object.values(pendingGroupState.dataTypesByID).filter(g => g.type.value == DataType.Passwords));

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey);
    }

    async deletePassword(masterKey: string, password: ReactivePassword): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        // TODO: should just hide the delete button for the vaultic password? Is this even needed anymore? 
        // Can users update their email another way, like via stripe and then I have a webhook for that?
        if (password.isVaultic.value)
        {
            app.popups.showAlert("Error", "Can't delete the username / password used for signing into Vaultic Services", false);
            return false;
        }

        const currentPassword = pendingState.dataTypesByID[password.id.value];
        if (!currentPassword)
        {
            await api.repositories.logs.log(undefined, `No Password`, "PasswordStore.Delete")
            return false;
        }

        this.checkRemoveFromDuplicate(password, pendingState.duplicatePasswords);
        delete pendingState.dataTypesByID[currentPassword.id.value]

        this.incrementCurrentAndSafePasswords(pendingState, Object.values(pendingState.dataTypesByID));

        const pendingGroupState = this.vault.groupStore.syncGroupsForPasswords(password.id.value, [], password.groups.value);
        const pendingFilterState = this.vault.filterStore.removePasswordFromFilters(password.id.value);

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey);
    }

    private incrementCurrentAndSafePasswords(pendingState: PasswordStoreState, passwords: ReactivePassword[])
    {
        pendingState.currentAndSafePasswords.current.push(passwords.length);

        const safePasswords = passwords.filter(p => p.isSafe());
        pendingState.currentAndSafePasswords.safe.push(safePasswords.length);
    }

    private async setPasswordProperties(masterKey: string, password: Password): Promise<boolean>
    {
        if (!password.isVaultic.value)
        {
            password.lastModifiedTime.value = new Date().getTime().toString();

            const [isWeak, isWeakMessage] = await api.helpers.validation.isWeak(password.password.value, "Password");
            password.isWeak.value = isWeak;
            password.isWeakMessage.value = isWeakMessage;

            password.containsLogin.value = password.password.value.includes(password.login.value);
        }

        password.passwordLength.value = password.password.value.length;

        const response = await cryptHelper.encrypt(masterKey, password.password.value);
        if (!response)
        {
            return false;
        }

        password.password.value = response.value!;
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
            for (let i = 0; i < password.securityQuestions.value.length; i++)
            {
                await updateSecurityQuestionQuestion(masterKey, password, i);
                await updateSecurityQuestionnAnswer(masterKey, password, i);
            }
        }
        else
        {
            for (let i = 0; i < updatedSecurityQuestionQuestions.length; i++)
            {
                let sq = password.securityQuestions.value.filter(q => q.id.value == updatedSecurityQuestionQuestions[i]);
                if (sq.length != 1)
                {
                    continue;
                }

                await updateSecurityQuestionQuestion(masterKey, password, i);
            }

            for (let i = 0; i < updatedSecurityQuestionAnswers.length; i++)
            {
                let sq = password.securityQuestions.value.filter(q => q.id.value == updatedSecurityQuestionAnswers[i]);
                if (sq.length != 1)
                {
                    continue;
                }

                await updateSecurityQuestionnAnswer(masterKey, password, i);
            }
        }

        async function updateSecurityQuestionQuestion(masterKey: string, password: Password, index: number)
        {
            password.securityQuestions.value[index].questionLength = password.securityQuestions.value[index].question.length;
            password.securityQuestions.value[index].question = (await cryptHelper.encrypt(masterKey, password.securityQuestions.value[index].question)).value ?? "";
        }

        async function updateSecurityQuestionnAnswer(masterKey: string, password: Password, index: number)
        {
            password.securityQuestions.value[index].answerLength = password.securityQuestions.value[index].answer.length;
            password.securityQuestions.value[index].answer = ((await cryptHelper.encrypt(masterKey, password.securityQuestions.value[index].answer)).value ?? "");
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

    get passwords() { return this.dataTypes; }
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

        this.internalOldPasswords = computed(() => this.dataTypes.filter(p => p.isOld()).map(p => p.id.value));
        this.internalWeakPasswords = computed(() => this.dataTypes.filter(p => p.isWeak.value).map(p => p.id.value));

        this.internalContainsLoginPasswords = computed(() => this.dataTypes.filter(p => p.containsLogin.value).map(p => p.id.value));
        this.internalDuplicatePasswords = computed(() => Object.keys(this.state.duplicatePasswords));

        this.internalDuplicatePasswordsLength = computed(() => Object.keys(this.state.duplicatePasswords).length);
        this.internalPinnedPasswords = computed(() => this.dataTypes.filter(p => app.userPreferences.pinnedPasswords.hasOwnProperty(p.id.value)));
        this.internalUnpinnedPasswords = computed(() => this.dataTypes.filter(p => !app.userPreferences.pinnedPasswords.hasOwnProperty(p.id.value)));

        this.internalActiveAtRiskPasswordType = ref(AtRiskType.None);
        this.internalHasVaulticPassword = computed(() => this.dataTypes.filter(p => p.isVaultic).length > 0);

        this.internalBreachedPasswords = computed(() => !app.userDataBreaches.userDataBreaches ? [] :
            this.dataTypes.filter(p => app.userDataBreaches.userDataBreaches.filter(b => b.PasswordID == p.id.value).length > 0).map(p => p.id.value));
    }

    protected preAssignState(state: PasswordStoreState): void 
    {
        super.preAssignState(state);

        const keys = Object.keys(this.state.dataTypesByID);
        for (let i = 0; i < keys.length; i++)
        {
            state.dataTypesByID[keys[i]] = createReactivePassword(state.dataTypesByID[keys[i]])
        }
    }

    protected getPasswordAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskPasswordType;
    }
}
