import { MutateStoreResponse } from "../../Types/Responses";
import { AxiosHelper } from "../../Types/ServerTypes";

export interface StoreController
{
	add: (data: string) => Promise<MutateStoreResponse>;
	update: (data: string) => Promise<MutateStoreResponse>;
	delete: (data: string) => Promise<MutateStoreResponse>
}

function createStoreController(path: string, axiosHelper: AxiosHelper): StoreController
{
	async function add(data: string): Promise<any>
	{
		return axiosHelper.post(`${path}/Add`, data);
	}

	async function update(data: string): Promise<any>
	{
		return axiosHelper.post(`${path}/Update`, data);
	}

	async function deleteValue(data: string): Promise<any>
	{
		return axiosHelper.post(`${path}/Delete`, data);
	}

	return {
		add,
		update,
		delete: deleteValue
	}
}

export function createFilterController(axiosHelper: AxiosHelper): StoreController
{
	return createStoreController('Filter', axiosHelper);
}

export function createGroupController(axiosHelper: AxiosHelper): StoreController
{
	return createStoreController('Group', axiosHelper);
}

export function createPasswordController(axiosHelper: AxiosHelper): StoreController
{
	return createStoreController('Password', axiosHelper);
}

export function createValueController(axiosHelper: AxiosHelper): StoreController
{
	return createStoreController('Value', axiosHelper);
}
