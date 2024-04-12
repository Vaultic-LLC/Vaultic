import { Password, CurrentAndSafeStructure, AtRiskType, DataFile } from "../../Types/EncryptedData";
import { ComputedRef, Ref, computed, ref } from "vue";
import { ReactivePassword } from "./ReactivePassword";
import { Dictionary } from "../../Types/DataStructures";
import { stores } from ".";
import { DataTypeStore, DataTypeStoreState } from "./Base";

export interface PasswordStoreState extends DataTypeStoreState<ReactivePassword>
{
	duplicatePasswords: Dictionary<string[]>;
	currentAndSafePasswords: CurrentAndSafeStructure;
}

class PasswordStore extends DataTypeStore<ReactivePassword, PasswordStoreState>
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

	constructor()
	{
		super();

		this.internalOldPasswords = computed(() => this.state.values.filter(p => p.isOld).map(p => p.id));
		this.internalWeakPasswords = computed(() => this.state.values.filter(p => p.isWeak).map(p => p.id));

		this.internalContainsLoginPasswords = computed(() => this.state.values.filter(p => p.containsLogin).map(p => p.id));
		this.internalDuplicatePasswords = computed(() => this.state.values.filter(p => p.isDuplicate).map(p => p.id));

		this.internalDuplicatePasswordsLength = computed(() => Object.keys(this.state.duplicatePasswords).length);
		this.internalPinnedPasswords = computed(() => this.state.values.filter(p => stores.userPreferenceStore.pinnedPasswords.hasOwnProperty(p.id)));
		this.internalUnpinnedPasswords = computed(() => this.state.values.filter(p => !stores.userPreferenceStore.pinnedPasswords.hasOwnProperty(p.id)));

		this.internalActiveAtRiskPasswordType = ref(AtRiskType.None);

		this.internalHasVaulticPassword = computed(() => this.state.values.filter(p => p.isVaultic).length > 0);
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

	async addPassword(key: string, password: Password): Promise<boolean>
	{
		const addPasswordData = {
			OldDays: stores.settingsStore.oldPasswordDays,
			MasterKey: key,
			Password: password,
			...stores.getStates()
		};

		const data: any = await window.api.server.password.add(JSON.stringify(addPasswordData));
		const succeeded = await stores.handleUpdateStoreResponse(key, data);

		this.events["onChange"]?.forEach(c => c());
		return succeeded;
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

		const data: any = await window.api.server.password.update(JSON.stringify(updatedPasswordData));
		const succeeded = await stores.handleUpdateStoreResponse(key, data);

		this.events["onChange"]?.forEach(c => c());
		return succeeded;
	}

	async deletePassword(key: string, password: ReactivePassword): Promise<boolean>
	{
		const deletePasswordData = {
			OldDays: stores.settingsStore.oldPasswordDays,
			MasterKey: key,
			Password: password,
			...stores.getStates()
		};

		const data: any = await window.api.server.password.delete(JSON.stringify(deletePasswordData));
		const succeeded = await stores.handleUpdateStoreResponse(key, data);

		this.events["onChange"]?.forEach(c => c());
		return succeeded;
	}
}

const passwordStore = new PasswordStore();
export default passwordStore;

export type PasswordStoreType = typeof passwordStore;
