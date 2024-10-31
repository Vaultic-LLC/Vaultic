import { ComputedRef, Ref, computed, ref } from "vue";
import createReactivePassword, { ReactivePassword } from "./ReactivePassword";
import { PrimaryDataTypeStore, StoreState } from "./Base";
import { generateUniqueIDForMap } from "../../Helpers/generatorHelper";
import cryptHelper from "../../Helpers/cryptHelper";
import { api } from "../../API";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import app from "./AppStore";
import { VaultStoreParameter } from "./VaultStore";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { AtRiskType, CurrentAndSafeStructure, Password } from "../../Types/DataTypes";
import { Field, FieldedObject, KnownMappedFields, SecondaryDataObjectCollectionType } from "@vaultic/shared/Types/Fields";

interface IPasswordStoreState extends StoreState
{
    passwordsByID: Field<Map<string, Field<ReactivePassword>>>;
    duplicatePasswords: Dictionary<string[]>;
    currentAndSafePasswords: CurrentAndSafeStructure;
};

export type PasswordStoreState = KnownMappedFields<IPasswordStoreState>;

export class PasswordStore extends PrimaryDataTypeStore<PasswordStoreState>
{
    constructor(vault: VaultStoreParameter)
    {
        super(vault, "passwordStoreState");
    }

    protected getPrimaryDataTypesByID(state: KnownMappedFields<IPasswordStoreState>): Field<Map<string, Field<SecondaryDataObjectCollectionType & FieldedObject>>>
    {
        return state.passwordsByID;
    }

    protected defaultState()
    {
        return {
            passwordsByID: new Field(new Map<string, Field<ReactivePassword>>()),
            duplicatePasswords: {},
            currentAndSafePasswords: { current: [], safe: [] },
        }
    }

    async addPassword(masterKey: string, password: Password, backup?: boolean): Promise<boolean>
    {
        backup = backup ?? app.isOnline;

        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState: PasswordStoreState = this.cloneState();

        password.id.value = await generateUniqueIDForMap(pendingState.passwordsByID.value);

        // doing this before adding saves us from having to remove the current password from the list of potential duplicates
        await this.checkUpdateDuplicatePrimaryObjects(masterKey, password, pendingState.passwordsByID, "password", pendingState.duplicatePasswords);

        if (!(await this.setPasswordProperties(masterKey, password)))
        {
            return false;
        }

        await this.updateSecurityQuestions(masterKey, password, true, [], []);

        const reactivePassword = new Field(createReactivePassword(password));
        pendingState.passwordsByID.value.set(password.id.value, reactivePassword);

        this.incrementCurrentAndSafePasswords(pendingState, pendingState.passwordsByID);

        // update groups before filters
        const pendingGroupState = this.vault.groupStore.syncGroupsForPasswords(reactivePassword.value.id.value, reactivePassword.value.groups.value, new Map());
        const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(new Map([[reactivePassword.value.id.value, reactivePassword]]), pendingGroupState.passwordGroupsByID);

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

        const currentPassword = pendingState.passwordsByID.value.get(updatingPassword.id.value);
        if (!currentPassword)
        {
            await api.repositories.logs.log(undefined, `No Password`, "PasswordStore.Update")
            return false;
        }

        // TODO: Check update email on sever if isVaultic
        if (updatingPassword.isVaultic.value && !app.isOnline)
        {
            return false;
        }

        // retrieve these before updating
        const addedGroups = updatingPassword.groups.value.difference(currentPassword.value.groups.value);
        const removedGroups = currentPassword.value.groups.value.difference(updatingPassword.groups.value);

        if (passwordWasUpdated)
        {
            // Don't support updating the master key at this time, set our 'new' password to our old one
            if (updatingPassword.isVaultic.value)
            {
                updatingPassword.password.value = currentPassword.value.password.value;
            }

            // do this before re encrypting the password
            await this.checkUpdateDuplicatePrimaryObjects(masterKey, updatingPassword, pendingState.passwordsByID, "password", pendingState.duplicatePasswords);
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

        const newPassword = createReactivePassword(updatingPassword);
        currentPassword.value = newPassword;

        this.incrementCurrentAndSafePasswords(pendingState, pendingState.passwordsByID);

        const pendingGroupState = this.vault.groupStore.syncGroupsForPasswords(updatingPassword.id.value, addedGroups, removedGroups);
        const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(new Map([[currentPassword.value.id.value, currentPassword]]), pendingGroupState.passwordGroupsByID);

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

        const currentPassword = pendingState.passwordsByID.value.get(password.id.value);
        if (!currentPassword)
        {
            await api.repositories.logs.log(undefined, `No Password`, "PasswordStore.Delete")
            return false;
        }

        this.checkRemoveFromDuplicate(password, pendingState.duplicatePasswords);
        pendingState.passwordsByID.value.delete(currentPassword.value.id.value);

        this.incrementCurrentAndSafePasswords(pendingState, pendingState.passwordsByID);

        const pendingGroupState = this.vault.groupStore.syncGroupsForPasswords(password.id.value, new Map(), password.groups.value);
        const pendingFilterState = this.vault.filterStore.removePasswordFromFilters(password.id.value);

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        return await transaction.commit(masterKey);
    }

    private incrementCurrentAndSafePasswords(pendingState: PasswordStoreState, passwords: Field<Map<string, Field<ReactivePassword>>>)
    {
        pendingState.currentAndSafePasswords.current.push(passwords.value.size);

        const safePasswords = passwords.value.filter((k, v) => v.value.isSafe());
        pendingState.currentAndSafePasswords.safe.push(safePasswords.size);
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
    private internalPasswords: ComputedRef<Field<ReactivePassword>[]>;

    private internalOldPasswords: ComputedRef<string[]>;
    private internalWeakPasswords: ComputedRef<string[]>;

    private internalContainsLoginPasswords: ComputedRef<string[]>;
    private internalDuplicatePasswords: ComputedRef<string[]>;

    private internalDuplicatePasswordsLength: ComputedRef<number>;
    private internalPinnedPasswords: ComputedRef<Field<ReactivePassword>[]>;
    private internalUnpinnedPasswords: ComputedRef<Field<ReactivePassword>[]>;

    private internalActiveAtRiskPasswordType: Ref<AtRiskType>;

    private internalBreachedPasswords: ComputedRef<string[]>;

    get passwords() { return this.internalPasswords.value; }
    get pinnedPasswords() { return this.internalPinnedPasswords.value; }
    get unpinnedPasswords() { return this.internalUnpinnedPasswords.value; }
    get oldPasswords() { return this.internalOldPasswords }
    get weakPasswords() { return this.internalWeakPasswords }
    get containsLoginPasswords() { return this.internalContainsLoginPasswords }
    get duplicatePasswords() { return this.internalDuplicatePasswords }
    get duplicatePasswordsLength() { return this.internalDuplicatePasswordsLength.value; }
    get currentAndSafePasswords() { return this.state.currentAndSafePasswords; }
    get activeAtRiskPasswordType() { return this.internalActiveAtRiskPasswordType.value; }
    get breachedPasswords() { return this.internalBreachedPasswords.value; }

    constructor(vault: any)
    {
        super(vault);

        this.internalPasswords = computed(() => this.state.passwordsByID.value.valueArray());

        this.internalOldPasswords = computed(() => this.state.passwordsByID.value.mapWhere((k, v) => v.value.isOld(), (k, v) => v.value.id.value));
        this.internalWeakPasswords = computed(() => this.state.passwordsByID.value.mapWhere((k, v) => v.value.isWeak.value, (k, v) => v.value.id.value));

        this.internalContainsLoginPasswords = computed(() => this.state.passwordsByID.value.mapWhere((k, v) => v.value.containsLogin.value, (k, v) => v.value.id.value));
        this.internalDuplicatePasswords = computed(() => Object.keys(this.state.duplicatePasswords));

        this.internalDuplicatePasswordsLength = computed(() => Object.keys(this.state.duplicatePasswords).length);
        this.internalPinnedPasswords = computed(() => this.passwords.filter(p => app.userPreferences.pinnedPasswords.value.has(p.value.id.value)));
        this.internalUnpinnedPasswords = computed(() => this.passwords.filter(p => !app.userPreferences.pinnedPasswords.value.has(p.value.id.value)));

        this.internalActiveAtRiskPasswordType = ref(AtRiskType.None);

        this.internalBreachedPasswords = computed(() => !app.userDataBreaches.userDataBreaches ? [] :
            this.passwords.filter(p => app.userDataBreaches.userDataBreaches.filter(b => b.PasswordID == p.value.id.value).length > 0).map(p => p.value.id.value));
    }

    protected preAssignState(state: PasswordStoreState): void 
    {
        super.preAssignState(state);

        for (const [key, value] of state.passwordsByID.value.entries())
        {
            value.value = createReactivePassword(value.value);
        }
    }

    protected getPasswordAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskPasswordType;
    }
}
