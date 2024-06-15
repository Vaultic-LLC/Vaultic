import { Password, CurrentAndSafeStructure, AtRiskType, DataFile } from "../../Types/EncryptedData";
import { ComputedRef, Ref, computed, ref } from "vue";
import createReactivePassword, { ReactivePassword } from "./ReactivePassword";
import { Dictionary } from "../../Types/DataStructures";
import { stores } from ".";
import { PrimaryDataObjectStore, DataTypeStoreState } from "./Base";
import { generateUniqueID } from "@renderer/Helpers/generatorHelper";

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
		return window.api.files.password;
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

	async updatePassword(password: Password, passwordWasUpdated: boolean, updatedSecurityQuestionQuestions: string[],
		updatedSecurityQuestionAnswers: string[], key: string): Promise<boolean>
	{
		const updatedPasswordData = {
			OldDays: stores.settingsStore.oldPasswordDays,
			MasterKey: key,
			Password: password,
			PasswordWasUpdated: passwordWasUpdated,
			UpdatedSecurityQuestionQuestions: updatedSecurityQuestionQuestions,
			UpdatedSecurityQuestionAnswers: updatedSecurityQuestionAnswers,
			...stores.getStates()
		};

		const data = await window.api.server.password.update(JSON.stringify(updatedPasswordData));
		if (data.EmailIsTaken)
		{
			stores.popupStore.showAlert("Unable to update password", "The new email is already in use. Please use a different one", false);
			return false;
		}

		const succeeded = await stores.handleUpdateStoreResponse(key, data);

		this.events["onChange"]?.forEach(c => c());
		return succeeded;
	}

	async deletePassword(key: string, password: ReactivePassword): Promise<boolean>
	{
		if (password.isVaultic)
		{
			stores.popupStore.showAlert("Error", "Can't delete the username / password used for signing into Vaultic Services", false);
			return false;
		}

		const deletePasswordData = {
			OldDays: stores.settingsStore.oldPasswordDays,
			MasterKey: key,
			Password: password,
			...stores.getStates()
		};

		const data = await window.api.server.password.delete(JSON.stringify(deletePasswordData));
		const succeeded = await stores.handleUpdateStoreResponse(key, data);

		this.events["onChange"]?.forEach(c => c());
		return succeeded;
	}

	private incrementCurrentAndSafePasswords()
	{
		this.state.currentAndSafePasswords.current.push(this.state.values.length);

		const safePasswords = this.state.values.filter(
			p => !p.isWeak && !this.duplicatePasswords[p.id] && !p.containsLogin && !p.isOld);

		this.state.currentAndSafePasswords.safe.push(safePasswords.length);
	}
}

const passwordStore = new PasswordStore();
export default passwordStore;

export type PasswordStoreType = typeof passwordStore;
