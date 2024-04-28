import { LogResponse } from "../../Types/Responses";
import { AxiosHelper } from "../../Types/ServerTypes";

export interface AppController
{
	log: (exception: string, stack: string) => Promise<LogResponse>;
}

export function createAppController(axiosHelper: AxiosHelper): AppController
{
	function log(exception: string, stack: string)
	{
		return axiosHelper.post('App/Log', {
			Exception: exception,
			Stack: stack
		});
	}

	return {
		log
	}
}
