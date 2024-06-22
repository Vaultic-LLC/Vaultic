import { ColorPalette, colorPalettes } from "../../Types/Colors";
import { ComputedRef, computed } from "vue";
import { stores } from ".";
import { FilterStatus } from "../../Types/Table";
import { AutoLockTime } from "../../Types/Settings";
import { Store, StoreState } from "./Base";
import { DataFile } from "../../Types/EncryptedData";
import cryptHelper from "../../Helpers/cryptHelper";
import { defaultHandleFailedResponse } from "../../Helpers/ResponseHelper";
import { api } from "../../API";

export interface SettingsStoreState extends StoreState
{
    readonly rowChunkAmount: number;
    colorPalettes: ColorPalette[];
    autoLockTime: AutoLockTime;
    loginRecordsToStorePerDay: number;
    numberOfDaysToStoreLoginRecords: number;
    randomValueLength: number;
    randomPhraseLength: number;
    multipleFilterBehavior: FilterStatus;
    oldPasswordDays: number;
    percentMetricForPulse: number;
    defaultMarkdownInEditScreens: boolean;
}

class SettingsStore extends Store<SettingsStoreState>
{
    private internalAutoLockNumberTime: ComputedRef<number>;

    get rowChunkAmount() { return this.state.rowChunkAmount; }
    get colorPalettes() { return this.state.colorPalettes; }
    get autoLockTime() { return this.state.autoLockTime; }
    get autoLockNumberTime() { return this.internalAutoLockNumberTime.value; }
    get loginRecordsToStorePerDay() { return this.state.loginRecordsToStorePerDay; }
    get numberOfDaysToStoreLoginRecords() { return this.state.numberOfDaysToStoreLoginRecords }
    get randomValueLength() { return this.state.randomValueLength; }
    get randomPhraseLength() { return this.state.randomPhraseLength; }
    get multipleFilterBehavior() { return this.state.multipleFilterBehavior; }
    get oldPasswordDays() { return this.state.oldPasswordDays; }
    get percentMetricForPulse() { return this.state.percentMetricForPulse; }
    get defaultMarkdownInEditScreens() { return this.state.defaultMarkdownInEditScreens; }

    constructor()
    {
        super();
        this.internalAutoLockNumberTime = computed(() => this.calcAutolockTime(this.state.autoLockTime));
    }

    protected defaultState()
    {
        return {
            version: 0,
            rowChunkAmount: 10,
            colorPalettes: colorPalettes,
            autoLockTime: AutoLockTime.OneMinute,
            loginRecordsToStorePerDay: 14,
            numberOfDaysToStoreLoginRecords: 30,
            randomValueLength: 25,
            randomPhraseLength: 7,
            multipleFilterBehavior: FilterStatus.Or,
            oldPasswordDays: 30,
            percentMetricForPulse: 1,
            defaultMarkdownInEditScreens: true
        };
    }

    protected getFile(): DataFile
    {
        return api.files.settings;
    }

    protected async writeState(key: string): Promise<boolean>
    {
        this.state.version += 1;
        const success = await super.writeState(key);
        if (!success)
        {
            return false;
        }

        if (!stores.appStore.isOnline)
        {
            return true;
        }

        const state = await cryptHelper.encrypt(key, JSON.stringify(this.state));
        if (state.success)
        {
            const data =
            {
                MasterKey: key,
                SettingsStoreState: state.value
            };

            const response = await api.server.user.backupSettings(JSON.stringify(data));
            if (!response.Success)
            {
                defaultHandleFailedResponse(response);
            }

            return response.Success;
        }

        return false;
    }

    private calcAutolockTime(time: AutoLockTime): number
    {
        switch (time)
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

    public async updateColorPalette(key: string, colorPalette: ColorPalette): Promise<void>
    {
        const oldColorPalette: ColorPalette[] = this.state.colorPalettes.filter(cp => cp.id == colorPalette.id);
        if (oldColorPalette.length != 1)
        {
            return Promise.resolve();
        }

        Object.assign(oldColorPalette[0], colorPalette);
        if (stores.userPreferenceStore.currentColorPalette.id == oldColorPalette[0].id)
        {
            stores.userPreferenceStore.updateCurrentColorPalette(oldColorPalette[0]);
        }

        await super.writeState(key);
    }
}

const settingStore = new SettingsStore();
export default settingStore;

export type SettingStoreType = typeof settingStore;
