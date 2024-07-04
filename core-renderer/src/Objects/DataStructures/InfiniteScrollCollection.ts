import { stores } from "../Stores";

export default class InfiniteScrollCollection<T>
{
	chunkSize: number;
	allValues: T[];
	visualValues: T[];

	constructor()
	{
		this.chunkSize = stores.settingsStore.rowChunkAmount;
		this.allValues = [];
		this.visualValues = [];
	}

	loadNextChunk()
	{
		this.visualValues.push(...this.allValues.splice(0, this.chunkSize));
	}

	setValues(values: T[])
	{
		this.allValues = [...values];
		this.visualValues = [];
		this.loadNextChunk();
	}
}
