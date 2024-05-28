import { AxiosInstance } from "axios";
import { BaseResponse } from "./Responses";

export interface AxiosHelper
{
	instance: AxiosInstance;
	postSTS: <T extends BaseResponse>(serverPath: string, data?: any) => Promise<T | BaseResponse>;
	postAPI: <T extends BaseResponse>(serverPath: string, data?: any) => Promise<T | BaseResponse>;
}

export interface EncryptedRequest
{
	Key: string;
	Data: string;
}
