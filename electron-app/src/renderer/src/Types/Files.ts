import { NameValuePair, Password } from "./EncryptedData"

export type DataFileState =
    {
        passwords: Password[],
        nameValuePairs: NameValuePair[],
        passwordHash: string,
    };

// export type SettingsFileState =
//     {
//         showPasswordInterval: TimeInterval,
//         logoutInterval: TimeInterval,
//         passwordFilePath: string
//     };