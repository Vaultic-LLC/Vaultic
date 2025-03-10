import { ComputedRef, Ref, computed, ref } from "vue";
import createReactivePassword, { ReactivePassword } from "./ReactivePassword";
import { PrimaryDataTypeStore, StoreEvents, StoreState } from "./Base";
import { generateUniqueIDForMap } from "../../Helpers/generatorHelper";
import cryptHelper from "../../Helpers/cryptHelper";
import { api } from "../../API";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import app from "./AppStore";
import { VaultStoreParameter } from "./VaultStore";
import { AtRiskType, CurrentAndSafeStructure, Password, RelatedDataTypeChanges, SecurityQuestion } from "../../Types/DataTypes";
import { Field, IFieldedObject, KnownMappedFields, SecondaryDataObjectCollectionType } from "@vaultic/shared/Types/Fields";
import { FieldTreeUtility } from "../../Types/Tree";
import { WebFieldConstructor } from "../../Types/Fields";

interface IPasswordStoreState extends StoreState
{
    passwordsByID: Field<Map<string, Field<ReactivePassword>>>;
    passwordsByDomain: Field<Map<string, Field<Map<string, Field<string>>>>>;
    duplicatePasswords: Field<Map<string, Field<Map<string, Field<string>>>>>;
    currentAndSafePasswords: Field<KnownMappedFields<CurrentAndSafeStructure>>;
};

export type PasswordStoreEvents = StoreEvents | "onCheckPasswordBreach";
export type PasswordStoreState = KnownMappedFields<IPasswordStoreState>;

export class PasswordStore extends PrimaryDataTypeStore<PasswordStoreState, PasswordStoreEvents>
{
    constructor(vault: VaultStoreParameter)
    {
        super(vault, "passwordStoreState");
    }

    protected getPrimaryDataTypesByID(state: KnownMappedFields<IPasswordStoreState>): Field<Map<string, Field<SecondaryDataObjectCollectionType & IFieldedObject>>>
    {
        return state.passwordsByID;
    }

    protected defaultState()
    {
        return FieldTreeUtility.setupIDs<IPasswordStoreState>({
            version: WebFieldConstructor.create(0),
            passwordsByID: WebFieldConstructor.create(new Map<string, Field<ReactivePassword>>()),
            passwordsByDomain: WebFieldConstructor.create(new Map<string, Field<Map<string, Field<string>>>>()),
            duplicatePasswords: WebFieldConstructor.create(new Map<string, Field<Map<string, Field<string>>>>()),
            currentAndSafePasswords: WebFieldConstructor.create(new CurrentAndSafeStructure()),
        });
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

        const reactivePassword = WebFieldConstructor.create(createReactivePassword(password));
        pendingState.passwordsByID.value.set(password.id.value, reactivePassword);
        this.updatePasswordsByDomain(pendingState, reactivePassword.value.id.value, reactivePassword.value.domain.value);

        await this.incrementCurrentAndSafePasswords(pendingState, pendingState.passwordsByID);

        // update groups before filters
        const pendingGroupState = this.vault.groupStore.syncGroupsForPasswords(reactivePassword.value.id.value, new RelatedDataTypeChanges(reactivePassword.value.groups.value));
        const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(new Map([[reactivePassword.value.id.value, reactivePassword]]), pendingGroupState.passwordGroupsByID, true);

        transaction.updateVaultStore(this, pendingState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        if (!(await transaction.commit(masterKey, backup)))
        {
            return false;
        }

        app.currentVault.passwordsByDomain = this.state.passwordsByDomain;

        // too difficult to store some state and re check all data breaches against a new password 
        if (app.isOnline)
        {
            this.emit("onCheckPasswordBreach", reactivePassword);
        }

        return true;
    }

    async updatePassword(masterKey: string, updatingPassword: Password, passwordWasUpdated: boolean, updatedSecurityQuestionQuestions: string[],
        updatedSecurityQuestionAnswers: string[], backup?: boolean): Promise<boolean>
    {
        backup = backup ?? app.isOnline;

        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        const pendingState = this.cloneState();

        const currentPassword = pendingState.passwordsByID.value.get(updatingPassword.id.value);
        if (!currentPassword)
        {
            await api.repositories.logs.log(undefined, `No Password`, "PasswordStore.Update")
            return false;
        }

        // TODO: Check update email on sever if isVaultic. Need to update it in my database, for stripe, and locally. Would 
        // preferably have this be the only way to update email, and not via a webhook but Idk if thats possible to prevent. Wil
        // need to look into
        if (updatingPassword.isVaultic.value && !app.isOnline && currentPassword.value.email.value != updatingPassword.email.value)
        {
            return false;
        }

        // retrieve these before updating
        const changedGroups = this.getRelatedDataTypeChanges(currentPassword.value.groups.value, updatingPassword.groups.value);

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
            this.checkUpdateDuplicatePrimaryObjectsModifiedTime(updatingPassword.id.value, pendingState.duplicatePasswords);

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

        this.updatePasswordsByDomain(pendingState, currentPassword.value.id.value, updatingPassword.domain.value, currentPassword.value.domain.value);
        const newPassword = createReactivePassword(updatingPassword);
        currentPassword.value = newPassword;

        await this.incrementCurrentAndSafePasswords(pendingState, pendingState.passwordsByID);

        const pendingGroupState = this.vault.groupStore.syncGroupsForPasswords(updatingPassword.id.value, changedGroups);
        const pendingFilterState = this.vault.filterStore.syncFiltersForPasswords(new Map([[currentPassword.value.id.value, currentPassword]]), pendingGroupState.passwordGroupsByID, true);

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
        this.updatePasswordsByDomain(pendingState, currentPassword.value.id.value, undefined, currentPassword.value.domain.value);

        await this.incrementCurrentAndSafePasswords(pendingState, pendingState.passwordsByID);

        const pendingGroupState = this.vault.groupStore.syncGroupsForPasswords(password.id.value, new RelatedDataTypeChanges(undefined, password.groups.value, undefined));
        const pendingFilterState = this.vault.filterStore.removePasswordFromFilters(password.id.value);

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
            if (!pendingState.passwordsByDomain.value.has(newDomain))
            {
                pendingState.passwordsByDomain.addMapValue(newDomain, WebFieldConstructor.create(new Map()));
            }

            pendingState.passwordsByDomain.value.get(newDomain)?.addMapValue(id, WebFieldConstructor.create(id));
        }

        if (oldDomain && newDomain != oldDomain)
        {
            if (!pendingState.passwordsByDomain.value.has(oldDomain))
            {
                return;
            }

            pendingState.passwordsByDomain.value.get(oldDomain)?.value.delete(id);
        }
    }

    private async incrementCurrentAndSafePasswords(pendingState: PasswordStoreState, passwords: Field<Map<string, Field<ReactivePassword>>>)
    {
        const id = await generateUniqueIDForMap(pendingState.currentAndSafePasswords.value.current.value);
        pendingState.currentAndSafePasswords.value.current.addMapValue(id, WebFieldConstructor.create(passwords.value.size));

        const safePasswords = passwords.value.filter((k, v) => this.passwordIsSafe(pendingState, v.value));
        pendingState.currentAndSafePasswords.value.safe.addMapValue(id, WebFieldConstructor.create(safePasswords.size));
    }

    private passwordIsSafe(state: PasswordStoreState, password: ReactivePassword)
    {
        return !password.isOld() && !password.containsLogin.value && !password.isWeak.value && !state.duplicatePasswords.value.has(password.id.value);
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
            for (const [key, value] of password.securityQuestions.value.entries())
            {
                await updateSecurityQuestionQuestion(masterKey, value);
                await updateSecurityQuestionnAnswer(masterKey, value);
            }
        }
        else
        {
            for (let i = 0; i < updatedSecurityQuestionQuestions.length; i++)
            {
                let sq = password.securityQuestions.value.get(updatedSecurityQuestionQuestions[i]);
                if (!sq)
                {
                    continue;
                }

                await updateSecurityQuestionQuestion(masterKey, sq);
            }

            for (let i = 0; i < updatedSecurityQuestionAnswers.length; i++)
            {
                let sq = password.securityQuestions.value.get(updatedSecurityQuestionAnswers[i]);
                if (!sq)
                {
                    continue;
                }

                await updateSecurityQuestionnAnswer(masterKey, sq);
            }
        }

        async function updateSecurityQuestionQuestion(masterKey: string, securityQuestion: Field<SecurityQuestion>)
        {
            securityQuestion.value.question.value = (await cryptHelper.encrypt(masterKey, securityQuestion.value.question.value)).value ?? "";
        }

        async function updateSecurityQuestionnAnswer(masterKey: string, securityQuestion: Field<SecurityQuestion>)
        {
            securityQuestion.value.answer.value = ((await cryptHelper.encrypt(masterKey, securityQuestion.value.answer.value)).value ?? "");
        }
    }
}

export class ReactivePasswordStore extends PasswordStore
{
    private internalPasswords: ComputedRef<Field<ReactivePassword>[]>;

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

        this.internalPasswords = computed(() => this.state.passwordsByID.value.valueArray());

        this.internalOldPasswords = computed(() => this.state.passwordsByID.value.mapWhere((k, v) => v.value.isOld(), (k, v) => v.value.id.value));
        this.internalWeakPasswords = computed(() => this.state.passwordsByID.value.mapWhere((k, v) => v.value.isWeak.value, (k, v) => v.value.id.value));
        this.internalContainsLoginPasswords = computed(() => this.state.passwordsByID.value.mapWhere((k, v) => v.value.containsLogin.value, (k, v) => v.value.id.value));

        this.internalCurrentAndSafePasswordsCurrent = computed(() => this.state.currentAndSafePasswords.value.current.value.map((k, v) => v.value));
        this.internalCurrentAndSafePasswordsSafe = computed(() => this.state.currentAndSafePasswords.value.safe.value.map((k, v) => v.value));

        this.internalActiveAtRiskPasswordType = ref(AtRiskType.None);

        this.internalBreachedPasswords = computed(() => !app.vaultDataBreaches.vaultDataBreaches ? [] :
            this.passwords.filter(p => app.vaultDataBreaches.vaultDataBreaches.filter(b => b.PasswordID == p.value.id.value).length > 0).map(p => p.value.id.value));
    }

    protected preAssignState(state: PasswordStoreState): void 
    {
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
