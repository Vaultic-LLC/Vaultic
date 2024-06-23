import { Password, CurrentAndSafeStructure, AtRiskType, DataFile } from "../../Types/EncryptedData";
import { ComputedRef, Ref, computed, ref } from "vue";
import createReactivePassword, { ReactivePassword } from "./ReactivePassword";
import { Dictionary } from "../../Types/DataStructures";
import { stores } from ".";
import { PrimaryDataObjectStore, DataTypeStoreState } from "./Base";
import { generateUniqueID } from "../../Helpers/generatorHelper";
import cryptHelper from "../../Helpers/cryptHelper";
import { api } from "../../API"

export interface PasswordStoreState extends DataTypeStoreState<ReactivePassword>
{
    duplicatePasswords: Dictionary<string[]>;
    currentAndSafePasswords: CurrentAndSafeStructure;
}

class PasswordStore extends PrimaryDataObjectStore<ReactivePassword, PasswordStoreState>
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

    constructor()
    {
        super();

        this.internalOldPasswords = computed(() => this.state.values.filter(p => p.isOld).map(p => p.id));
        this.internalWeakPasswords = computed(() => this.state.values.filter(p => p.isWeak).map(p => p.id));

        this.internalContainsLoginPasswords = computed(() => this.state.values.filter(p => p.containsLogin).map(p => p.id));
        this.internalDuplicatePasswords = computed(() => Object.keys(this.state.duplicatePasswords));

        this.internalDuplicatePasswordsLength = computed(() => Object.keys(this.state.duplicatePasswords).length);
        this.internalPinnedPasswords = computed(() => this.state.values.filter(p => stores.userPreferenceStore.pinnedPasswords.hasOwnProperty(p.id)));
        this.internalUnpinnedPasswords = computed(() => this.state.values.filter(p => !stores.userPreferenceStore.pinnedPasswords.hasOwnProperty(p.id)));

        this.internalActiveAtRiskPasswordType = ref(AtRiskType.None);
        this.internalHasVaulticPassword = computed(() => this.state.values.filter(p => p.isVaultic).length > 0);

        this.internalBreachedPasswords = computed(() => !stores.userDataBreachStore.userDataBreaches ? [] :
            this.state.values.filter(p => stores.userDataBreachStore.userDataBreaches.filter(b => b.PasswordID == p.id).length > 0).map(p => p.id));
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

    protected getFile(): DataFile
    {
        return api.files.password;
    }

    protected getPasswordAtRiskType(): Ref<AtRiskType>
    {
        return this.internalActiveAtRiskPasswordType;
    }

    async addPassword(masterKey: string, password: Password): Promise<boolean>
    {
        password.id = await generateUniqueID(this.state.values);

        // doing this before adding saves us from having to remove the current password from the list of potential duplicates
        this.checkUpdateDuplicatePrimaryObjects(masterKey, password, this.passwords, "password", this.state.duplicatePasswords);

        if (!(await this.setPasswordProperties(masterKey, password)))
        {
            return false;
        }

        this.updateSecurityQuestions(masterKey, password, true, [], []);

        const reactivePassword = await createReactivePassword(masterKey, password);
        this.state.values.push(reactivePassword);
        this.incrementCurrentAndSafePasswords();

        // update groups before filters
        stores.groupStore.syncGroupsForPasswords(reactivePassword.id, reactivePassword.groups, []);
        stores.filterStore.syncFiltersForPasswords(stores.filterStore.passwordFilters, [reactivePassword]);

        if (!(await stores.groupStore.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        if (!(await stores.filterStore.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        if (!(await this.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        this.events["onChange"]?.forEach(c => c());
        return true;
    }

    async updatePassword(masterKey: string, updatingPassword: Password, passwordWasUpdated: boolean, updatedSecurityQuestionQuestions: string[],
        updatedSecurityQuestionAnswers: string[]): Promise<boolean>
    {
        const passwords = this.state.values.filter(p => p.id == updatingPassword.id);
        if (passwords.length != 1)
        {
            return false;
        }

        // TODO: Check update email on sever if isVaultic

        const currentPassword = passwords[0];

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
            this.checkUpdateDuplicatePrimaryObjects(masterKey, updatingPassword,
                this.state.values.filter(p => p.id != updatingPassword.id), "password", this.state.duplicatePasswords);

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

        this.incrementCurrentAndSafePasswords();

        this.updateSecurityQuestions(masterKey, updatingPassword, false, updatedSecurityQuestionQuestions, updatedSecurityQuestionAnswers);
        Object.assign(this.state.values.filter(p => p.id == updatingPassword.id), updatingPassword);

        stores.groupStore.syncGroupsForPasswords(updatingPassword.id, addedGroups, removedGroups);
        stores.filterStore.syncFiltersForPasswords(stores.filterStore.passwordFilters, [updatingPassword]);

        if (!(await stores.groupStore.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        if (!(await stores.filterStore.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        if (!(await this.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        this.events["onChange"]?.forEach(c => c());
        return true;
    }

    async deletePassword(masterKey: string, password: ReactivePassword): Promise<boolean>
    {
        if (password.isVaultic)
        {
            stores.popupStore.showAlert("Error", "Can't delete the username / password used for signing into Vaultic Services", false);
            return false;
        }

        const passwordIndex = this.state.values.indexOf(password);
        if (passwordIndex < 0)
        {
            return false;
        }

        this.state.values.splice(passwordIndex, 1);

        stores.groupStore.syncGroupsForPasswords(password.id, [], password.groups);
        stores.filterStore.removePasswordFromFilters(password.id);

        if (!(await stores.groupStore.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        if (!(await stores.filterStore.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        if (!(await this.writeState(masterKey)))
        {
            // TODO:
            return false;
        }

        this.events["onChange"]?.forEach(c => c());
        return true;
    }

    private incrementCurrentAndSafePasswords()
    {
        this.state.currentAndSafePasswords.current.push(this.state.values.length);

        const safePasswords = this.state.values.filter(
            p => !p.isWeak && !this.duplicatePasswords[p.id] && !p.containsLogin && !p.isOld);

        this.state.currentAndSafePasswords.safe.push(safePasswords.length);
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

            if (password.password.includes(password.login))
            {
                password.containsLogin = true;
            }

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

                updateSecurityQuestionQuestion(masterKey, password, i);
            }

            for (let i = 0; i < updatedSecurityQuestionAnswers.length; i++)
            {
                let sq = password.securityQuestions.filter(q => q.id == updatedSecurityQuestionAnswers[i]);
                if (sq.length != 1)
                {
                    continue;
                }

                updateSecurityQuestionnAnswer(masterKey, password, i);
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

const passwordStore = new PasswordStore();
export default passwordStore;

export type PasswordStoreType = typeof passwordStore;
