import { AtRiskType, DataFile } from "../../Types/EncryptedData";
import fileHelper from "../../Helpers/fileHelper";
import { Ref, reactive, ref } from "vue";
import { DataType } from "../../Types/Table";
import { Dictionary } from "../../Types/DataStructures";
import { Stores } from ".";

export interface StoreState
{
    version: number;
}

export interface DataTypeStoreState<T> extends StoreState
{
    values: T[];
}

export type StoreEvents = "onChanged";

export class Store<T extends {} & StoreState, U extends string = StoreEvents>
{
    protected state: T;
    loadedFile: boolean;
    events: Dictionary<{ (): void }[]>;

    constructor()
    {
        // @ts-ignore
        this.state = reactive(this.defaultState());
        this.loadedFile = false;
        this.events = {};
    }

    protected defaultState(): T
    {
        return {} as T;
    }

    protected getFile(): DataFile
    {
        return {} as DataFile;
    }

    protected writeState(key: string): Promise<boolean>
    {
        return fileHelper.write<T>(key, this.state, this.getFile());
    }

    protected postAssignState(_: T): void { }

    public init(_: Stores) { }

    public resetToDefault()
    {
        this.loadedFile = false;
        Object.assign(this.state, this.defaultState());
    }

    public getVersion(): number
    {
        return this.state.version;
    }

    public getState(): T
    {
        return this.state;
    }

    public async updateState(key: string, state: T): Promise<boolean>
    {
        Object.assign(this.state, state);
        const success = await this.writeState(key);
        if (!success)
        {
            return false;
        }

        this.events['onChanged']?.forEach(f => f());
        return true;
    }

    public async readState(key: string): Promise<boolean>
    {
        if (this.loadedFile)
        {
            return true;
        }

        if (!(await this.getFile().exists()))
        {
            return true;
        }

        const [succeeded, state] = await fileHelper.read<T>(key, this.getFile());
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

    public addEvent(event: U, callback: () => void)
    {
        if (this.events[event])
        {
            this.events[event].push(callback);
            return;
        }

        this.events[event] = [callback];
    }

    public removeEvent(event: U, callback: () => void)
    {
        if (!this.events[event])
        {
            return;
        }

        this.events[event] = this.events[event].filter(c => c != callback);
    }
}

export class DataTypeStore<U, T extends DataTypeStoreState<U>> extends Store<T>
{
    constructor()
    {
        super()
    }

    public resetToDefault()
    {
        super.resetToDefault();
        this.getPasswordAtRiskType().value = AtRiskType.None;
        this.getValueAtRiskType().value = AtRiskType.None;
    }

    protected getPasswordAtRiskType(): Ref<AtRiskType>
    {
        return ref({} as AtRiskType);
    }

    protected getValueAtRiskType(): Ref<AtRiskType>
    {
        return ref({} as AtRiskType);
    }

    protected doToggleAtRiskType(currentType: Ref<AtRiskType>, newAtRiskType: AtRiskType)
    {
        if (currentType.value != newAtRiskType)
        {
            currentType.value = newAtRiskType;
            return;
        }

        currentType.value = AtRiskType.None;
    }

    public toggleAtRiskType(dataType: DataType, atRiskType: AtRiskType)
    {
        if (dataType == DataType.Passwords)
        {
            this.doToggleAtRiskType(this.getPasswordAtRiskType(), atRiskType);
        }
        else if (dataType == DataType.NameValuePairs)
        {
            this.doToggleAtRiskType(this.getValueAtRiskType(), atRiskType);
        }
    }
}
