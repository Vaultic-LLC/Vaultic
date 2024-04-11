import { ColorPalette, colorPalettes, emptyColorPalette } from "@renderer/Types/Colors";
import { Store } from "./Base";
import { DataFile } from "@renderer/Types/EncryptedData";
import fileHelper from "@renderer/Helpers/fileHelper";
import { Ref, ref, watch } from "vue";
import { DataType } from "@renderer/Types/Table";
import { Stores, stores } from ".";
import { Dictionary } from "@renderer/Types/DataStructures";

interface UserPreferencesStoreState
{
	currentColorPalette: ColorPalette;
	pinnedFilters: Dictionary<any>;
	pinnedGroups: Dictionary<any>;
	pinnedPasswords: Dictionary<any>;
	pinnedValues: Dictionary<any>;
}

class UserPreferenceStore extends Store<UserPreferencesStoreState>
{
	private internalCurrentPrimaryColor: Ref<string>;

	get currentColorPalette() { return this.state.currentColorPalette; }
	set currentColorPalette(value: ColorPalette) { this.state.currentColorPalette = value; }
	get currentPrimaryColor() { return this.internalCurrentPrimaryColor }
	get pinnedFilters() { return this.state.pinnedFilters; }
	get pinnedGroups() { return this.state.pinnedGroups; }
	get pinnedPasswords() { return this.state.pinnedPasswords; }
	get pinnedValues() { return this.state.pinnedValues; }

	constructor()
	{
		super();

		this.internalCurrentPrimaryColor = ref('');
		this.readState('');
		this.setCurrentPrimaryColor(DataType.Passwords);
	}

	public init(stores: Stores)
	{
		watch(() => this.state.currentColorPalette, () =>
		{
			this.setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
		});

		watch(() => stores.appStore.activePasswordValuesTable, (newValue) =>
		{
			this.setCurrentPrimaryColor(newValue);
		});

		this.setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
	}

	protected defaultState(): UserPreferencesStoreState
	{
		return {
			currentColorPalette: colorPalettes[0],
			pinnedFilters: {},
			pinnedGroups: {},
			pinnedPasswords: {},
			pinnedValues: {}
		};
	}

	protected getFile(): DataFile
	{
		return window.api.files.userPreferences;
	}

	public async readState(_: string)
	{
		if (this.loadedFile)
		{
			return true;
		}

		if (!(await window.api.files.userPreferences.exists()))
		{
			return true;
		}

		const [succeeded, state] = await fileHelper.readUnencrypted<UserPreferencesStoreState>(window.api.files.userPreferences);
		if (!succeeded)
		{
			return false;
		}

		this.loadedFile = true;
		Object.assign(this.state, state);
		this.postAssignState(state);
		this.events['onChanged']?.forEach(f => f());

		return true;
	}

	protected writeState(_: string)
	{
		return fileHelper.writeUnencrypted<UserPreferencesStoreState>(this.state, this.getFile());
	}

	private setCurrentPrimaryColor(dataType: DataType)
	{
		switch (dataType)
		{
			case DataType.NameValuePairs:
				this.currentPrimaryColor.value = this.state.currentColorPalette.valuesColor.primaryColor;
				break;
			case DataType.Passwords:
			default:
				this.currentPrimaryColor.value = this.state.currentColorPalette.passwordsColor.primaryColor;
		}
	}

	public async updateCurrentColorPalette(colorPalette: ColorPalette)
	{
		this.state.currentColorPalette = emptyColorPalette;
		this.state.currentColorPalette = colorPalette;

		this.setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
		await this.writeState('');
	}

	public async addPinnedFilter(id: string)
	{
		this.state.pinnedFilters[id] = {};
		this.writeState('');
	}

	public async removePinnedFilters(id: string)
	{
		delete this.state.pinnedFilters[id];
		this.writeState('');
	}

	public async addPinnedGroup(id: string)
	{
		this.state.pinnedGroups[id] = {};
		this.writeState('');
	}

	public async removePinnedGroups(id: string)
	{
		delete this.state.pinnedGroups[id];
		this.writeState('');
	}

	public async addPinnedPassword(id: string)
	{
		this.state.pinnedPasswords[id] = {};
		this.writeState('');
	}

	public async removePinnedPasswords(id: string)
	{
		delete this.state.pinnedPasswords[id];
		this.writeState('');
	}

	public async addPinnedValue(id: string)
	{
		this.state.pinnedValues[id] = {};
		this.writeState('');
	}

	public async removePinnedValues(id: string)
	{
		delete this.state.pinnedValues[id];
		this.writeState('');
	}
}

const userPreferenceStore = new UserPreferenceStore();
export default userPreferenceStore;
export type UserPreferenceStoreType = typeof userPreferenceStore;
