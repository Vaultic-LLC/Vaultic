import { stores } from "@renderer/Objects/Stores";

export function defaultHandleFailedResponse(response: any, showAlerts: boolean = true)
{
	if (response.InvalidLicense === true)
	{
		stores.popupStore.showPaymentSetup();
	}
	else if (response.IncorrectDevice === true)
	{
		stores.popupStore.showIncorrectDevice(response);
	}
	else if (response.InvalidSession === true)
	{
		stores.popupStore.showSessionExpired();
	}
	else if (showAlerts)
	{
		// technically this shouldn't ever happen with requests that come from the app
		if (response.InvalidRequest === true)
		{
			stores.popupStore.showAlert("Unexpected Error", "An unexpected error has occured. Please try again or", true);
		}
		else if (response.IncorrectAPIKey === true)
		{
			stores.popupStore.showAlert("Unable to complete request", "Unable to complete the request. Please try again or", true);
		}
		else if (response.UnknownError === true)
		{
			stores.popupStore.showErrorResponseAlert(response);
		}
	}
}
