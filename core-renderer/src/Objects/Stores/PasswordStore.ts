import { ComputedRef, Ref, computed, ref } from "vue";
import createReactivePassword, { ReactivePassword } from "./ReactivePassword";
import { PrimaryDataTypeStore, PrimarydataTypeStoreStateKeys, SecondarydataTypeStoreStateKeys, StoreEvents } from "./Base";
import cryptHelper from "../../Helpers/cryptHelper";
import { api } from "../../API";
import StoreUpdateTransaction from "../StoreUpdateTransaction";
import app from "./AppStore";
import { VaultStoreParameter } from "./VaultStore";
import { AtRiskType, IPrimaryDataObject, Password, RelatedDataTypeChanges, SecurityQuestion } from "../../Types/DataTypes";
import { KnownMappedFields } from "@vaultic/shared/Types/Fields";
import { uniqueIDGenerator } from "@vaultic/shared/Utilities/UniqueIDGenerator";
import { FilterStoreState, FilterStoreStateKeys } from "./FilterStore";
import { GroupStoreState } from "./GroupStore";
import { CurrentAndSafeStructure, defaultPasswordStoreState, DictionaryAsList, DoubleKeyedObject, PendingStoreState, StorePathRetriever, StoreState, StoreType } from "@vaultic/shared/Types/Stores";
import { OH } from "@vaultic/shared/Utilities/PropertyManagers";
import { isOld } from "../../Helpers/DataTypeHelper";
import { start } from "repl";

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

export enum UpdatePasswordResponse
{
    Success,
    EmailIsTaken,
    Failed
};

export interface PasswordStoreStateKeys extends PrimarydataTypeStoreStateKeys
{
    'securityQuestions': '';
    'securityQuestions.question': '';
    'passwordsByDomain': '';
    'passwordsByDomain.passwords': '';
}

const PasswordStorePathRetriever: StorePathRetriever<PasswordStoreStateKeys> =
{
    'dataTypesByID': (...ids: string[]) => `p`,
    'dataTypesByID.dataType': (...ids: string[]) => `p.${ids[0]}`,
    'dataTypesByID.dataType.filters': (...ids: string[]) => `p.${ids[0]}.i`,
    'dataTypesByID.dataType.groups': (...ids: string[]) => `p.${ids[0]}.g`,
    'securityQuestions': (...ids: string[]) => `p.${ids[0]}.q`,
    'securityQuestions.question': (...ids: string[]) => `p.${ids[0]}.q.${ids[1]}`,
    'passwordsByDomain': (...ids: string[]) => `o`,
    'passwordsByDomain.passwords': (...ids: string[]) => `o.${ids[0]}`,
    'duplicateDataTypes': (...ids: string[]) => 'd',
    'duplicateDataTypes.dataTypes': (...ids: string[]) => `d.${ids[0]}`,
    'currentAndSafeDataTypes': (...ids: string[]) => 'c',
    'currentAndSafeDataTypes.current': (...ids: string[]) => 'c.c',
    'currentAndSafeDataTypes.safe': (...ids: string[]) => 'c.s',
    'dataTypesByHash': (...ids: string[]) => 'h',
    'dataTypesByHash.dataTypes': (...ids: string[]) => `h.${ids[0]}`
};

export type PasswordStoreEvents = StoreEvents | "onCheckPasswordBreach" | "onCheckPasswordsForBreach";
export type PasswordStoreState = KnownMappedFields<IPasswordStoreState>;

export class PasswordStore extends PrimaryDataTypeStore<PasswordStoreState, PasswordStoreStateKeys, PasswordStoreEvents>
{
    constructor(vault: VaultStoreParameter)
    {
        super(vault, StoreType.Password, PasswordStorePathRetriever);
    }

    protected getPrimaryDataTypesByID(state: KnownMappedFields<IPasswordStoreState>): { [key: string]: IPrimaryDataObject }
    {
        return state.p;
    }

    protected defaultState()
    {
        return defaultPasswordStoreState();
    }

    async addPassword(
        masterKey: string,
        password: Password,
        addedSecurityQuestions: SecurityQuestion[],
        pendingPasswordStoreState: PendingStoreState<PasswordStoreState, PasswordStoreStateKeys>): Promise<boolean>
    {
        const filterStoreState = app.currentVault.filterStore.getPendingState()!;
        const groupStoreState = app.currentVault.groupStore.getPendingState()!;

        if (!await this.addPasswordToStores(masterKey, password, addedSecurityQuestions, pendingPasswordStoreState, filterStoreState, groupStoreState))
        {
            return false;
        }

        return await this.commitPasswordEdits(masterKey, [password], pendingPasswordStoreState, filterStoreState, groupStoreState);
    }

    async commitPasswordEdits(
        masterKey: string,
        addedPasswords: Password[],
        pendingPasswordStoreState: PendingStoreState<PasswordStoreState, PasswordStoreStateKeys>,
        pendingFilterStoreState: PendingStoreState<FilterStoreState, FilterStoreStateKeys>,
        pendingGroupStoreState: PendingStoreState<GroupStoreState, SecondarydataTypeStoreStateKeys>): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);

        transaction.updateVaultStore(this, pendingPasswordStoreState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupStoreState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterStoreState);

        if (!(await transaction.commit(masterKey)))
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

    async addPasswordToStores(
        masterKey: string,
        password: Password,
        addedSecurityQuestions: SecurityQuestion[],
        pendingPasswordState: PendingStoreState<PasswordStoreState, PasswordStoreStateKeys>,
        pendingFilterStoreState: PendingStoreState<FilterStoreState, FilterStoreStateKeys>,
        pendingGroupStoreState: PendingStoreState<GroupStoreState, SecondarydataTypeStoreStateKeys>): Promise<boolean>
    {
        password.id = uniqueIDGenerator.generate();

        await this.updateValuesByHash(pendingPasswordState, "p", password, undefined);

        // doing this before adding saves us from having to remove the current password from the list of potential duplicates
        await this.checkUpdateDuplicatePrimaryObjects(masterKey, password, "p", pendingPasswordState);

        if (!(await this.setPasswordProperties(masterKey, password)))
        {
            return false;
        }

        const reactivePassword = createReactivePassword(password);
        pendingPasswordState.addValue('dataTypesByID', password.id, reactivePassword);

        // Do this after adding the password since we rely on retrieving it to update security questions
        await this.updateSecurityQuestions(masterKey, password, addedSecurityQuestions, [], [], [], pendingPasswordState);

        this.updatePasswordsByDomain(pendingPasswordState, reactivePassword.id, reactivePassword.d);

        await this.incrementCurrentAndSafe(pendingPasswordState, this.passwordIsSafe);

        // update groups before filters
        this.vault.groupStore.syncGroupsForPasswords(reactivePassword.id, new RelatedDataTypeChanges(reactivePassword.g), pendingGroupStoreState);
        this.vault.filterStore.syncFiltersForPasswords([reactivePassword], pendingPasswordState, pendingGroupStoreState.state.p, pendingFilterStoreState);

        return true;
    }

    async updatePassword(
        masterKey: string,
        updatingPassword: Password,
        passwordWasUpdated: boolean,
        addedSecurityQuestions: SecurityQuestion[],
        updatedSecurityQuestionQuestions: SecurityQuestion[],
        updatedSecurityQuestionAnswers: SecurityQuestion[],
        deletedSecurityQuestions: string[],
        groups: DictionaryAsList,
        pendingPasswordState: PendingStoreState<PasswordStoreState, PasswordStoreStateKeys>): Promise<UpdatePasswordResponse>
    {
        const currentPassword: ReactivePassword | undefined = pendingPasswordState.getObject('dataTypesByID.dataType', updatingPassword.id);
        if (!currentPassword)
        {
            await api.repositories.logs.log(undefined, `No Password`, "PasswordStore.Update")
            return UpdatePasswordResponse.Failed;
        }

        const finishUpdatePassword = async () => 
        {
            // retrieve these before updating
            const changedGroups = this.getRelatedDataTypeChanges(currentPassword.g, groups);

            if (passwordWasUpdated)
            {
                // Don't support updating the master key at this time, set our 'new' password to our old one
                if (updatingPassword.v)
                {
                    updatingPassword.p = currentPassword.p;
                }

                await this.updateValuesByHash(pendingPasswordState, "p", updatingPassword, currentPassword);

                // do this before re encrypting the password
                await this.checkUpdateDuplicatePrimaryObjects(masterKey, updatingPassword, "p", pendingPasswordState);

                if (!(await this.setPasswordProperties(masterKey, updatingPassword)))
                {
                    return UpdatePasswordResponse.Failed;
                }
            }
            else if (!updatingPassword.v)
            {
                // need to check to see if the password contains their potentially updated username
                const decryptResponse = await cryptHelper.decrypt(masterKey, updatingPassword.p);
                if (!decryptResponse.success)
                {
                    return UpdatePasswordResponse.Failed;
                }

                if (decryptResponse.value?.includes(updatingPassword.l))
                {
                    updatingPassword.c = true;
                }
            }

            await this.updateSecurityQuestions(masterKey, updatingPassword, addedSecurityQuestions, updatedSecurityQuestionQuestions,
                updatedSecurityQuestionAnswers, deletedSecurityQuestions, pendingPasswordState);

            this.updatePasswordsByDomain(pendingPasswordState, currentPassword.id, updatingPassword.d, currentPassword.d);

            pendingPasswordState.commitProxyObject("dataTypesByID.dataType", updatingPassword, updatingPassword.id);

            await this.incrementCurrentAndSafe(pendingPasswordState, this.passwordIsSafe);
            this.syncGroupsForPrimaryObject(updatingPassword.id, changedGroups, pendingPasswordState);

            const pendingGroupState = this.vault.groupStore.getPendingState()!;
            this.vault.groupStore.syncGroupsForPasswords(updatingPassword.id, changedGroups, pendingGroupState);

            const pendingFilterState = this.vault.filterStore.getPendingState()!;
            this.vault.filterStore.syncFiltersForPasswords([currentPassword], pendingPasswordState, pendingGroupState.state.p, pendingFilterState);

            const transaction = new StoreUpdateTransaction(this.vault.userVaultID);

            transaction.updateVaultStore(this, pendingPasswordState);
            transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
            transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

            if (!(await transaction.commit(masterKey)))
            {
                return UpdatePasswordResponse.Failed;
            }

            app.currentVault.passwordsByDomain = this.state.o;

            if (app.isOnline)
            {
                this.emit("onCheckPasswordBreach", currentPassword);
            }

            return UpdatePasswordResponse.Success;
        }

        if (updatingPassword.v && currentPassword.e != updatingPassword.e)
        {
            if (!app.isOnline)
            {
                app.popups.showAlert("Unable to edit email", "Unable to edit your Vaultic email while offline. Please log into online mode to update your email", false);
                return UpdatePasswordResponse.Failed;
            }

            const startVerificationResponse = await api.server.user.startEmailVerification(updatingPassword.e);
            if (startVerificationResponse.EmailIsTaken)
            {
                return UpdatePasswordResponse.EmailIsTaken;
            }
            else if (!startVerificationResponse.Success)
            {
                return UpdatePasswordResponse.Failed;
            }

            const updatedEmailOnServer = await new Promise<boolean>((resolve) =>
            {
                app.popups.showVerifyEmailPopup(app.userPreferences.currentPrimaryColor.value, () => { resolve(false) }, () => { resolve(true) })
            });

            if (!updatedEmailOnServer)
            {
                return UpdatePasswordResponse.Failed;
            }

            const updateEmailLocallyResponse = await api.repositories.users.updateUserEmail(updatingPassword.e);
            if (!updateEmailLocallyResponse.success)
            {
                return UpdatePasswordResponse.Failed;
            }

            return finishUpdatePassword();
        }
        else
        {
            return finishUpdatePassword();
        }
    }

    async deletePassword(
        masterKey: string,
        password: ReactivePassword): Promise<boolean>
    {
        // TODO: should just hide the delete button for the vaultic password? Is this even needed anymore? 
        // Can users update their email another way, like via stripe and then I have a webhook for that?
        if (password.v)
        {
            app.popups.showAlert("Error", "Can't delete the username / password used for signing into Vaultic Services", false);
            return false;
        }

        const pendingPasswordState = this.getPendingState()!;
        const currentPassword: ReactivePassword | undefined = pendingPasswordState.getObject('dataTypesByID.dataType', password.id);
        if (!currentPassword)
        {
            await api.repositories.logs.log(undefined, `No Password`, "PasswordStore.Delete")
            return false;
        }

        await this.updateValuesByHash(pendingPasswordState, "p", undefined, currentPassword);

        this.checkRemoveFromDuplicate(password, pendingPasswordState);
        pendingPasswordState.deleteValue('dataTypesByID', currentPassword.id);
        this.updatePasswordsByDomain(pendingPasswordState, currentPassword.id, undefined, currentPassword.d);

        await this.incrementCurrentAndSafe(pendingPasswordState, this.passwordIsSafe);

        const pendingGroupState = this.vault.groupStore.getPendingState()!;
        this.vault.groupStore.syncGroupsForPasswords(password.id, new RelatedDataTypeChanges(undefined, password.g, undefined), pendingGroupState);

        const pendingFilterState = this.vault.filterStore.getPendingState()!;
        this.vault.filterStore.removePasswordFromFilters(password.id, pendingFilterState);

        const transaction = new StoreUpdateTransaction(this.vault.userVaultID);
        transaction.updateVaultStore(this, pendingPasswordState);
        transaction.updateVaultStore(this.vault.groupStore, pendingGroupState);
        transaction.updateVaultStore(this.vault.filterStore, pendingFilterState);

        if (!(await transaction.commit(masterKey)))
        {
            return false;
        }

        app.currentVault.passwordsByDomain = this.state.o;
        return true;
    }

    private updatePasswordsByDomain(
        pendingPasswordState: PendingStoreState<PasswordStoreState, PasswordStoreStateKeys>,
        id: string,
        newDomain?: string,
        oldDomain?: string)
    {
        if (newDomain === oldDomain)
        {
            return;
        }

        const passwordsByDomain: DoubleKeyedObject = pendingPasswordState.getObject('passwordsByDomain');
        if (newDomain)
        {
            if (!OH.has(passwordsByDomain, newDomain))
            {
                const newDomainObject: DictionaryAsList = {};
                newDomainObject[id] = true;

                pendingPasswordState.addValue('passwordsByDomain', newDomain, newDomainObject);
            }
            else
            {
                pendingPasswordState.addValue('passwordsByDomain.passwords', id, true, newDomain);
            }
        }

        if (oldDomain)
        {
            if (!OH.has(passwordsByDomain, oldDomain))
            {
                return;
            }

            if (OH.size(passwordsByDomain[oldDomain]) == 1)
            {
                // last domain, delete the entire object
                pendingPasswordState.deleteValue('passwordsByDomain', oldDomain);
            }
            else
            {
                pendingPasswordState.deleteValue('passwordsByDomain.passwords', id, oldDomain);
            }
        }
    }

    private passwordIsSafe(duplicateDataTypes: DoubleKeyedObject, password: ReactivePassword)
    {
        return !isOld(password.t) && !password.c && !password.w && !OH.has(duplicateDataTypes, password.id);
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

        password.p = response.value!;
        return true;
    }

    private async updateSecurityQuestions(
        masterKey: string,
        password: Password,
        addedSecurityQuestions: SecurityQuestion[],
        updatedSecurityQuestionQuestions: SecurityQuestion[],
        updatedSecurityQuestionAnswers: SecurityQuestion[],
        deletedSecurityQuestions: string[],
        pendingPasswordState: PendingStoreState<PasswordStoreState, PasswordStoreStateKeys>)
    {
        for (let i = 0; i < addedSecurityQuestions.length; i++)
        {
            await updateSecurityQuestionQuestion(addedSecurityQuestions[i]);
            await updateSecurityQuestionnAnswer(addedSecurityQuestions[i]);

            pendingPasswordState.addValue('securityQuestions', addedSecurityQuestions[i].id, addedSecurityQuestions[i], password.id);
        }

        for (let i = 0; i < updatedSecurityQuestionQuestions.length; i++)
        {
            await updateSecurityQuestionQuestion(updatedSecurityQuestionQuestions[i]);
            pendingPasswordState.updateValue('securityQuestions.question', 'q', updatedSecurityQuestionQuestions[i].q, password.id, updatedSecurityQuestionQuestions[i].id);
        }

        for (let i = 0; i < updatedSecurityQuestionAnswers.length; i++)
        {
            await updateSecurityQuestionnAnswer(updatedSecurityQuestionAnswers[i]);
            pendingPasswordState.updateValue('securityQuestions.question', 'a', updatedSecurityQuestionAnswers[i].a, password.id, updatedSecurityQuestionAnswers[i].id);
        }

        for (let i = 0; i < deletedSecurityQuestions.length; i++)
        {
            pendingPasswordState.deleteValue('securityQuestions', updatedSecurityQuestionQuestions[i].id, password.id);
        }

        async function updateSecurityQuestionQuestion(securityQuestion: SecurityQuestion)
        {
            securityQuestion.q = (await cryptHelper.encrypt(masterKey, securityQuestion.q)).value ?? "";
        }

        async function updateSecurityQuestionnAnswer(securityQuestion: SecurityQuestion)
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

        this.internalOldPasswords = computed(() => OH.mapWhere(this.state.p, (_, v) => isOld(v.t), (k, _) => k));
        this.internalWeakPasswords = computed(() => OH.mapWhere(this.state.p, (_, v) => v.w, (k, _) => k));
        this.internalContainsLoginPasswords = computed(() => OH.mapWhere(this.state.p, (_, v) => v.c, (k, _) => k));

        this.internalCurrentAndSafePasswordsCurrent = computed(() => this.state.c.c);
        this.internalCurrentAndSafePasswordsSafe = computed(() => this.state.c.s);

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
