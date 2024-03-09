import { AxiosHelper } from "./AxiosHelper";

export interface StoreController
{
	add: (data: string) => Promise<any>;
	update: (data: string) => Promise<any>;
	delete: (data: string) => Promise<any>
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

	async function deleteFilter(data: string): Promise<any>
	{
		return axiosHelper.post(`${path}/Delete`, data);
	}

	return {
		add,
		update,
		delete: deleteFilter
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
