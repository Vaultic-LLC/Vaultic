import { stores } from "@renderer/Objects/Stores";

export function defaultHandleFailedResponse(response: any)
{
	if (response.LicenseStatus != undefined && response.LicenseStatus != 1)
	{
		stores.popupStore.showPaymentSetup();
	}
	else if (response.IncorrectDevice)
	{
		stores.popupStore.showIncorrectDevice(response);
	}
	else if (response.InvalidSession)
	{
		stores.popupStore.showSessionExpired();
	}
	else if (response.UnknownError)
	{
		stores.popupStore.showErrorResponseAlert(response);
	}
}
