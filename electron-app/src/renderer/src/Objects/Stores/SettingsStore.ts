import { ColorPalette, colorPalettes, emptyColorPalette } from "../../Types/Colors";
import { ComputedRef, Ref, computed, reactive, ref, watch } from "vue";
import { Stores, stores } from ".";
import { DataType, FilterStatus } from "../../Types/Table";
import { AutoLockTime } from "../../Types/Settings";
import fileHelper from "@renderer/Helpers/fileHelper";
import { Store } from "./Base";
import { DataFile } from "@renderer/Types/EncryptedData";

export interface SettingsStoreState
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
	enableSyncing: boolean;
	automaticSyncing: boolean;
}

// export interface SettingsStore
// {
// 	state: SettingsStoreState;
// 	rowChunkAmount: number;
// 	colorPalettes: ColorPalette[];
// 	currentColorPalette: ColorPalette;
// 	currentPrimaryColor: Ref<string>;
// 	autoLockTime: AutoLockTime;
// 	autoLockNumberTime: number;
// 	loginRecordsToStorePerDay: number;
// 	numberOfDaysToStoreLoginRecords: number;
// 	randomValueLength: number;
// 	multipleFilterBehavior: FilterStatus;
// 	oldPasswordDays: number;
// 	percentMetricForPulse: number;
// 	enableSyncing: boolean;
// 	automaticSyncing: boolean;
// 	init: (stores: Stores) => void;
// 	readState: (key: string) => Promise<boolean>;
// 	resetToDefault: () => void;
// 	updateColorPalette: (key: string, colorPalette: ColorPalette) => Promise<void>;
// 	updateSettings: (key: string, newState: SettingsStoreState) => Promise<void>;
// }

// let settingsState: SettingsStoreState;

// export default function useSettingsStore(): SettingsStore
// {
// 	settingsState = reactive(defaultState());

// 	const currentPrimaryColor: Ref<string> = ref('');
// 	const autoLockNumberTime: ComputedRef<number> = computed(() =>
// 	{
// 		switch (settingsState.autoLockTime)
// 		{
// 			case AutoLockTime.FiveMinutes:
// 				return 1000 * 60 * 5;
// 			case AutoLockTime.FifteenMinutes:
// 				return 1000 * 60 * 15;
// 			case AutoLockTime.ThirtyMinutes:
// 				return 1000 * 60 * 30;
// 			case AutoLockTime.OneMinute:
// 			default:
// 				return 1000 * 60;
// 		}
// 	});

// 	function defaultState(): SettingsStoreState
// 	{
// 		return {
// 			loadedFile: false,
// 			rowChunkAmount: 10,
// 			colorPalettes: colorPalettes,
// 			currentColorPalette: colorPalettes[0],
// 			autoLockTime: AutoLockTime.OneMinute,
// 			loginRecordsToStorePerDay: 14,
// 			numberOfDaysToStoreLoginRecords: 30,
// 			randomValueLength: 20,
// 			multipleFilterBehavior: FilterStatus.Or,
// 			oldPasswordDays: 30,
// 			percentMetricForPulse: 1,
// 			enableSyncing: true,
// 			automaticSyncing: true
// 		};
// 	}

// 	function toString()
// 	{
// 		return JSON.stringify(settingsState);
// 	}

// 	async function readState(key: string): Promise<boolean>
// 	{
// 		return new Promise((resolve, _) =>
// 		{
// 			if (settingsState.loadedFile)
// 			{
// 				resolve(true);
// 			}

// 			fileHelper.read<SettingsStoreState>(key, window.api.files.settings).then((state: SettingsState) =>
// 			{
// 				state.loadedFile = true;
// 				Object.assign(settingsState, state);

// 				resolve(true);
// 			}).catch(() =>
// 			{
// 				// TODO Handle Error
// 				resolve(false);
// 			});
// 		});
// 	}

// 	function writeState(key: string): Promise<void>
// 	{
// 		return fileHelper.write(key, settingsState, window.api.files.settings);
// 	}

// 	function resetToDefault()
// 	{
// 		Object.assign(settingsState, defaultState());
// 	}

// async function updateColorPalette(key: string, colorPalette: ColorPalette): Promise<void>
// {
// 	const oldColorPalette: ColorPalette[] = settingsState.colorPalettes.filter(cp => cp.id == colorPalette.id);
// 	if (oldColorPalette.length != 1)
// 	{
// 		// TODO: Handle Error
// 		return Promise.resolve();
// 	}

// 	Object.assign(oldColorPalette[0], colorPalette);
// 	if (settingsState.currentColorPalette.id == oldColorPalette[0].id)
// 	{
// 		settingsState.currentColorPalette = emptyColorPalette;
// 		settingsState.currentColorPalette = oldColorPalette[0];

// 		setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
// 	}

// 	await writeState(key);
// 	stores.syncToServer(key);
// }

// function init(stores: Stores)
// {
// 	watch(() => settingsState.currentColorPalette, () =>
// 	{
// 		setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
// 	});

// 	watch(() => stores.appStore.activePasswordValuesTable, (newValue) =>
// 	{
// 		setCurrentPrimaryColor(newValue);
// 	});

// 	setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
// }

// function setCurrentPrimaryColor(dataType: DataType)
// {
// 	switch (dataType)
// 	{
// 		case DataType.NameValuePairs:
// 			currentPrimaryColor.value = settingsState.currentColorPalette.valuesColor.primaryColor;
// 			break;
// 		case DataType.Passwords:
// 		default:
// 			currentPrimaryColor.value = settingsState.currentColorPalette.passwordsColor.primaryColor;
// 	}
// }

// 	async function updateSettings(key: string, newState: SettingsState): Promise<void>
// 	{
// 		Object.assign(settingsState, newState);
// 		await writeState(key);
// 		stores.syncToServer(key);
// 	}

// 	return {
// 		get state() { return settingsState; },
// 		get rowChunkAmount() { return settingsState.rowChunkAmount; },
// 		get colorPalettes() { return settingsState.colorPalettes; },
// 		get currentColorPalette() { return settingsState.currentColorPalette; },
// 		set currentColorPalette(value: ColorPalette) { settingsState.currentColorPalette = value; },
// 		get autoLockTime() { return settingsState.autoLockTime; },
// 		get autoLockNumberTime() { return autoLockNumberTime.value; },
// 		get loginRecordsToStorePerDay() { return settingsState.loginRecordsToStorePerDay; },
// 		get numberOfDaysToStoreLoginRecords() { return settingsState.numberOfDaysToStoreLoginRecords },
// 		get randomValueLength() { return settingsState.randomValueLength; },
// 		get multipleFilterBehavior() { return settingsState.multipleFilterBehavior; },
// 		get oldPasswordDays() { return settingsState.oldPasswordDays; },
// 		get percentMetricForPulse() { return settingsState.percentMetricForPulse; },
// 		get enableSyncing() { return settingsState.enableSyncing; },
// 		get automaticSyncing() { return settingsState.automaticSyncing; },
// 		currentPrimaryColor,
// 		init,
// 		toString,
// 		readState,
// 		resetToDefault,
// 		updateColorPalette,
// 		updateSettings
// 	};
// }

class SettingsStore extends Store<SettingsStoreState>
{
	private internalCurrentPrimaryColor: Ref<string>;
	private internalAutoLockNumberTime: ComputedRef<number>;

	get rowChunkAmount() { return this.state.rowChunkAmount; }
	get colorPalettes() { return this.state.colorPalettes; }
	get currentColorPalette() { return this.state.currentColorPalette; }
	set currentColorPalette(value: ColorPalette) { this.state.currentColorPalette = value; }
	get autoLockTime() { return this.state.autoLockTime; }
	get autoLockNumberTime() { return this.internalAutoLockNumberTime.value; }
	get loginRecordsToStorePerDay() { return this.state.loginRecordsToStorePerDay; }
	get numberOfDaysToStoreLoginRecords() { return this.state.numberOfDaysToStoreLoginRecords }
	get randomValueLength() { return this.state.randomValueLength; }
	get multipleFilterBehavior() { return this.state.multipleFilterBehavior; }
	get oldPasswordDays() { return this.state.oldPasswordDays; }
	get percentMetricForPulse() { return this.state.percentMetricForPulse; }
	get enableSyncing() { return this.state.enableSyncing; }
	get automaticSyncing() { return this.state.automaticSyncing; }
	get currentPrimaryColor() { return this.internalCurrentPrimaryColor }

	constructor()
	{
		super();

		this.internalCurrentPrimaryColor = ref('');
		this.internalAutoLockNumberTime = computed(this.calcAutolockTime);
	}

	protected defaultState()
	{
		return {
			loadedFile: false,
			rowChunkAmount: 10,
			colorPalettes: colorPalettes,
			currentColorPalette: colorPalettes[0],
			autoLockTime: AutoLockTime.OneMinute,
			loginRecordsToStorePerDay: 14,
			numberOfDaysToStoreLoginRecords: 30,
			randomValueLength: 20,
			multipleFilterBehavior: FilterStatus.Or,
			oldPasswordDays: 30,
			percentMetricForPulse: 1,
			enableSyncing: true,
			automaticSyncing: true
		};
	}

	protected getFile(): DataFile
	{
		return window.api.files.settings;
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

	private calcAutolockTime(): number
	{
		switch (this?.state?.autoLockTime)
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

	public async updateColorPalette(key: string, colorPalette: ColorPalette): Promise<void>
	{
		const oldColorPalette: ColorPalette[] = this.state.colorPalettes.filter(cp => cp.id == colorPalette.id);
		if (oldColorPalette.length != 1)
		{
			// TODO: Handle Error
			return Promise.resolve();
		}

		Object.assign(oldColorPalette[0], colorPalette);
		if (this.state.currentColorPalette.id == oldColorPalette[0].id)
		{
			this.state.currentColorPalette = emptyColorPalette;
			this.state.currentColorPalette = oldColorPalette[0];

			this.setCurrentPrimaryColor(stores.appStore.activePasswordValuesTable);
		}

		await super.writeState(key);

		// TODO
		stores.syncToServer(key);
	}
}

const settingStore = new SettingsStore();
export default settingStore;

export type SettingStoreType = typeof settingStore;
