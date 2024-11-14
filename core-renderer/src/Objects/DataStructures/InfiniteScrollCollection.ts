import { rowChunkAmount } from "../../Constants/Misc";

export default class InfiniteScrollCollection<T>
{
    chunkSize: number;
    allValues: T[];
    visualValues: T[];

    constructor()
    {
        this.chunkSize = rowChunkAmount;
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
