import { API } from "./Types/APITypes"

declare global
{
	interface Window
	{
		api: API
	}
}
