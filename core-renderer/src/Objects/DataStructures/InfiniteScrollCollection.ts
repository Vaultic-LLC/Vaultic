import app from "../../Objects/Stores/AppStore";

export default class InfiniteScrollCollection<T>
{
    chunkSize: number;
    allValues: T[];
    visualValues: T[];

    constructor()
    {
        this.chunkSize = app.settings.rowChunkAmount;
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
