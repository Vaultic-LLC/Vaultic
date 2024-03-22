import { AtRiskType, DataFile, IKeyable } from "@renderer/Types/EncryptedData";
import fileHelper from "@renderer/Helpers/fileHelper";
import cryptHelper from "@renderer/Helpers/cryptHelper";
import { Ref, reactive, ref } from "vue";
import { DataType } from "@renderer/Types/Table";
import { Dictionary } from "@renderer/Types/DataStructures";
import { Stores } from ".";

export interface StoreState
{
	version: number;
}

export interface AuthenticationStoreState<T extends IKeyable> extends StoreState
{
	values: T[];
	hash: string;
	hashSalt: string;
}

type StoreEvent = "onChanged";

export class Store<T extends {}>
{
	state: T;
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

	protected writeState(key: string): Promise<void>
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

	public getState(): T
	{
		return this.state;
	}

	public async updateState(key: string, state: T)
	{
		Object.assign(this.state, state);
		await this.writeState(key);
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

		return true;
	}

	public addEvent(event: StoreEvent, callback: () => void)
	{
		if (this.events[event])
		{
			this.events[event].push(callback);
			return;
		}

		this.events[event] = [callback];
	}

	public removeEvent(event: StoreEvent, callback: () => void)
	{
		if (!this.events[event])
		{
			return;
		}

		this.events[event] = this.events[event].filter(c => c != callback);
	}
}

export class AuthenticationStore<U extends IKeyable, T extends AuthenticationStoreState<U>> extends Store<T>
{
	constructor()
	{
		super()
	}

	protected async writeState(key: string)
	{
		if (this.state.values.length == 0)
		{
			return this.getFile().empty();
		}

		return super.writeState(key);
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

	private async calculateHash<U extends IKeyable>(key: string, values: U[], salt: string): Promise<[boolean, string]>
	{
		let runningKeys: string = "";
		for (const v of values)
		{
			const result = await cryptHelper.decrypt(key, v.key);
			if (!result.success)
			{
				return [false, ""];
			}

			runningKeys += result.value ?? "";
		}

		const hash = window.api.utilities.hash.insecureHash(runningKeys);
		return [true, hash];
	}

	private async checkKey(key: string): Promise<boolean>
	{
		const calcualtedHash = await this.calculateHash(key, this.state.values, this.state.hashSalt);
		if (!calcualtedHash[0])
		{
			return false;
		}

		const currentHash = await cryptHelper.decrypt(key, this.state.hash);

		if (!currentHash.success)
		{
			return false;
		}

		return calcualtedHash[1] === currentHash.value;
	}

	public canAuthenticateKeyBeforeEntry(): Promise<boolean>
	{
		return this.getFile().exists();
	}

	public canAuthenticateKeyAfterEntry(): boolean
	{
		return this.state.values.length > 0;
	}

	public async checkKeyBeforeEntry(key: string): Promise<boolean>
	{
		if (!(await this.readState(key)))
		{
			return false;
		}

		return this.checkKey(key);
	}

	public checkKeyAfterEntry(key: string): Promise<boolean>
	{
		return this.checkKey(key);
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
