import { ColorPalette, colorPalettes } from "../../Types/Colors";
import { ComputedRef, computed } from "vue";
import { stores } from ".";
import { FilterStatus } from "../../Types/Table";
import { AutoLockTime } from "../../Types/Settings";
import { Store, StoreState } from "./Base";
import { DataFile } from "../../Types/EncryptedData";
import { api } from "../../API"
import StoreUpdateTransaction from "../StoreUpdateTransaction";

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
        super("SettingsStoreState");
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

    public getFile(): DataFile
    {
        return api.files.settings;
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

    public async update(masterKey: string, state: SettingsStoreState): Promise<boolean>
    {
        const transaction = new StoreUpdateTransaction();
        transaction.addStore(this, state);

        return this.commitAndBackup(masterKey, transaction);
    }

    public async updateColorPalette(masterKey: string, colorPalette: ColorPalette): Promise<void>
    {
        const transaction = new StoreUpdateTransaction();
        const pendingState = this.cloneState();

        const oldColorPalette: ColorPalette[] = pendingState.colorPalettes.filter(cp => cp.id == colorPalette.id);
        if (oldColorPalette.length != 1)
        {
            return Promise.resolve();
        }

        Object.assign(oldColorPalette[0], colorPalette);
        if (stores.userPreferenceStore.currentColorPalette.id == oldColorPalette[0].id)
        {
            stores.userPreferenceStore.updateCurrentColorPalette(transaction, oldColorPalette[0]);
        }

        transaction.addStore(this, pendingState);
        await this.commitAndBackup(masterKey, transaction);
    }
}

const settingStore = new SettingsStore();
export default settingStore;

export type SettingStoreType = typeof settingStore;
