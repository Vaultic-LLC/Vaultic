export interface ClientEnvironment 
{
    isTest: () => Promise<boolean>;
    failedToInitalizeDatabase: () => Promise<boolean>;
    recreateDatabase: () => Promise<boolean>;
}

export interface ClientVaulticCache 
{
    clear: () => void;
    setMasterKey: (masterKey: string) => void;
    clearMasterKey: () => void;
}