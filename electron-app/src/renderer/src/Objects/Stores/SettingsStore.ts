import { ColorPalette, colorPalettes, emptyColorPalette } from "../../Types/Colors";
import { ComputedRef, Ref, computed, reactive, ref, watch } from "vue";
import { Store, Stores, stores } from ".";
import { DataType, FilterStatus } from "../../Types/Table";
import { AutoLockTime } from "../../Types/Settings";
import File from "../Files/File"

export interface SettingsState
{
	loadedFile: boolean;
	readonly rowChunkAmount: number;
	colorPalettes: ColorPalette[];
	currentColorPalette: ColorPalette;
	autoLockTime: AutoLockTime;
	loginRecordsToStorePerDay: number;
	numberOfDaysToStoreLoginRecords: number;
	randomValueLength: number;
	multipleFilterBehavior: FilterStatus;
	oldPasswordDays: number;
	percentMetricForPulse: number;
}

export interface SettingsStore extends Store
{
	state: SettingsState;
	rowChunkAmount: number;
	colorPalettes: ColorPalette[];
	currentColorPalette: ColorPalette;
	currentPrimaryColor: Ref<string>;
	autoLockTime: AutoLockTime;
	autoLockNumberTime: number;
	loginRecordsToStorePerDay: number;
	numberOfDaysToStoreLoginRecords: number;
	randomValueLength: number;
	multipleFilterBehavior: FilterStatus;
	oldPasswordDays: number;
	percentMetricForPulse: number;
	init: (stores: Stores) => void;
	readState: (key: string) => Promise<boolean>;
	resetToDefault: () => void;
	updateColorPalette: (key: string, colorPalette: ColorPalette) => Promise<void>;
	updateSettings: (key: string, newState: SettingsState) => Promise<void>;
}

const settingsFile: File = new File("settings");
let settingsState: SettingsState;

export default function useSettingsStore(): SettingsStore
{
	settingsState = reactive(defaultState());

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

	function defaultState(): SettingsState
	{
		return {
			loadedFile: false,
			rowChunkAmount: 10,
			colorPalettes: colorPalettes,
			currentColorPalette: colorPalettes[0],
			autoLockTime: AutoLockTime.OneMinute,
			loginRecordsToStorePerDay: 15,
			numberOfDaysToStoreLoginRecords: 30,
			randomValueLength: 20,
			multipleFilterBehavior: FilterStatus.Or,
			oldPasswordDays: 30,
			percentMetricForPulse: 1
		};
	}

	async function readState(key: string): Promise<boolean>
	{
		return new Promise((resolve, _) =>
		{
			if (settingsState.loadedFile)
			{
				resolve(true);
			}

			settingsFile.read<SettingsState>(key).then((state: SettingsState) =>
			{
				state.loadedFile = true;
				Object.assign(settingsState, state);

				resolve(true);
			}).catch(() =>
			{
				// TODO Handle Error
				resolve(false);
			});
		});
	}

	function writeState(key: string): Promise<void>
	{
		return settingsFile.write(key, settingsState);
	}

	function resetToDefault()
	{
		Object.assign(settingsState, defaultState());
	}

	function updateColorPalette(key: string, colorPalette: ColorPalette): Promise<void>
	{
		const oldColorPalette: ColorPalette[] = settingsState.colorPalettes.filter(cp => cp.id == colorPalette.id);
		if (oldColorPalette.length != 1)
		{
			// TODO: Handle Error
			return Promise.resolve();
		}

		Object.assign(oldColorPalette[0], colorPalette);
		if (settingsState.currentColorPalette.id == oldColorPalette[0].id)
		{
			settingsState.currentColorPalette = emptyColorPalette;
			settingsState.currentColorPalette = oldColorPalette[0];

			setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
		}

		return writeState(key);
	}

	function init(stores: Stores)
	{
		watch(() => settingsState.currentColorPalette, () =>
		{
			setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
		});

		watch(() => stores.appStore.activePasswordValuesTable, (newValue) =>
		{
			setCurrentPrimaryColor(newValue);
		});

		setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
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

	function updateSettings(key: string, newState: SettingsState): Promise<void>
	{
		Object.assign(settingsState, newState);
		return writeState(key);
	}

	return {
		get state() { return settingsState; },
		get rowChunkAmount() { return settingsState.rowChunkAmount; },
		get colorPalettes() { return settingsState.colorPalettes; },
		get currentColorPalette() { return settingsState.currentColorPalette; },
		set currentColorPalette(value: ColorPalette) { settingsState.currentColorPalette = value; },
		get autoLockTime() { return settingsState.autoLockTime; },
		get autoLockNumberTime() { return autoLockNumberTime.value; },
		get loginRecordsToStorePerDay() { return settingsState.loginRecordsToStorePerDay; },
		get numberOfDaysToStoreLoginRecords() { return settingsState.numberOfDaysToStoreLoginRecords },
		get randomValueLength() { return settingsState.randomValueLength; },
		get multipleFilterBehavior() { return settingsState.multipleFilterBehavior; },
		get oldPasswordDays() { return settingsState.oldPasswordDays; },
		get percentMetricForPulse() { return settingsState.percentMetricForPulse; },
		currentPrimaryColor,
		init,
		readState,
		resetToDefault,
		updateColorPalette,
		updateSettings
	};
}
