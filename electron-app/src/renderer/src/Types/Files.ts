import { NameValuePair, Password } from "./EncryptedData"

export type DataFileState =
	{
		[key: string]: any;
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
