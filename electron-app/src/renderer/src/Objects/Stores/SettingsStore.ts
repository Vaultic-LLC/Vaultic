import { ColorPalette, colorPalettes, emptyColorPalette } from "../../Types/Colors";
import { ComputedRef, Ref, computed, reactive, ref, watch } from "vue";
import { Stores, stores } from ".";
import { DataType, FilterStatus } from "../../Types/Table";
import { AutoLockTime } from "../../Types/Settings";
import File from "../Files/File"

export interface SettingsState
{
	readonly rowChunkAmount: number;
	colorPalettes: ColorPalette[];
	currentColorPalette: ColorPalette;
	autoLockTime: AutoLockTime;
	loginRecordsToStore: number;
	randomValueLength: number;
	requireMasterKeyOnFilterGrouopSave: boolean;
	requireMasterKeyOnFilterGroupDelete: boolean;
	takePictureOnLogin: boolean;
	multipleFilterBehavior: FilterStatus;
}

export interface SettingsStore
{
	state: SettingsState;
	rowChunkAmount: number;
	colorPalettes: ColorPalette[];
	currentColorPalette: ColorPalette;
	currentPrimaryColor: Ref<string>;
	autoLockTime: AutoLockTime;
	autoLockNumberTime: number;
	loginRecordsToStore: number;
	randomValueLength: number;
	requireMasterKeyOnFilterGrouopSave: boolean;
	requireMasterKeyOnFilterGroupDelete: boolean;
	multipleFilterBehavior: FilterStatus;
	init: (stores: Stores) => void;
	loadData: (key: string) => void;
	updateColorPalette: (colorPalette: ColorPalette) => void;
	updateSettings: (key: string, newState: SettingsState) => void;
}

const settingsFile: File = new File("settings");

const settingsState: SettingsState = reactive(
	{
		rowChunkAmount: 10,
		colorPalettes: colorPalettes,
		currentColorPalette: colorPalettes[0],
		autoLockTime: AutoLockTime.OneMinute,
		loginRecordsToStore: 25,
		randomValueLength: 20,
		requireMasterKeyOnFilterGrouopSave: true,
		requireMasterKeyOnFilterGroupDelete: true,
		takePictureOnLogin: true,
		multipleFilterBehavior: FilterStatus.Or
	});

export default function useSettingsStore(): SettingsStore
{
	const currentPrimaryColor: Ref<string> = ref('');
	const autoLockNumberTime: ComputedRef<number> = computed(() =>
	{
		switch (settingsState.autoLockTime)
		{
			case AutoLockTime.FiveMinutes:
				return 1000 * 60 * 5;
			case AutoLockTime.FifteenMinutes:
				return 1000 * 60 * 15;
			case AutoLockTime.ThirtyMinutes:
				return 1000 * 60 * 30;
			case AutoLockTime.OneMinute:
			default:
				return 1000 * 60;
		}
	});

	function writeState(key: string)
	{
		settingsFile.write(key, settingsState);
	}

	function updateColorPalette(colorPalette: ColorPalette)
	{
		const oldColorPalette: ColorPalette[] = settingsState.colorPalettes.filter(cp => cp.id == colorPalette.id);
		if (oldColorPalette.length != 1)
		{
			return;
		}

		Object.assign(oldColorPalette[0], colorPalette);
		if (settingsState.currentColorPalette.id == oldColorPalette[0].id)
		{
			settingsState.currentColorPalette = emptyColorPalette;
			settingsState.currentColorPalette = oldColorPalette[0];

			setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
		}
	}

	function init(stores: Stores)
	{
		watch(() => settingsState.currentColorPalette, (newValue) =>
		{
			setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
		});

		watch(() => stores.appStore.activePasswordValuesTable, (newValue) =>
		{
			setCurrentPrimaryColor(newValue);
		});

		setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
	}

	function loadData(key: string)
	{
		const [succeeded, state] = settingsFile.read<SettingsState>(key);
		if (succeeded)
		{
			Object.assign(settingsState, state);
		}
	}

	function setCurrentPrimaryColor(dataType: DataType)
	{
		switch (dataType)
		{
			case DataType.NameValuePairs:
				currentPrimaryColor.value = settingsState.currentColorPalette.valuesColor.primaryColor;
				break;
			case DataType.Passwords:
			default:
				currentPrimaryColor.value = settingsState.currentColorPalette.passwordsColor.primaryColor;
		}
	}

	function updateSettings(key: string, newState: SettingsState)
	{
		Object.assign(settingsState, newState);
		writeState(key);
	}

	return {
		get state() { return settingsState; },
		get rowChunkAmount() { return settingsState.rowChunkAmount; },
		get colorPalettes() { return settingsState.colorPalettes; },
		get currentColorPalette() { return settingsState.currentColorPalette; },
		set currentColorPalette(value: ColorPalette) { settingsState.currentColorPalette = value; },
		get autoLockTime() { return settingsState.autoLockTime; },
		get autoLockNumberTime() { return autoLockNumberTime.value; },
		get loginRecordsToStore() { return settingsState.loginRecordsToStore; },
		set loginRecordsToStore(value: number) { settingsState.loginRecordsToStore = value; },
		get randomValueLength() { return settingsState.randomValueLength; },
		get requireMasterKeyOnFilterGrouopSave() { return settingsState.requireMasterKeyOnFilterGrouopSave; },
		get requireMasterKeyOnFilterGroupDelete() { return settingsState.requireMasterKeyOnFilterGroupDelete; },
		get multipleFilterBehavior() { return settingsState.multipleFilterBehavior; },
		currentPrimaryColor,
		init,
		loadData,
		updateColorPalette,
		updateSettings
	};
}
