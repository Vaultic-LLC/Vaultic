import app from "../Objects/Stores/AppStore";

export function defaultHandleFailedResponse(response: any, showAlerts: boolean = true)
{
    if (response.InvalidLicense === true)
    {
        app.popups.showPaymentSetup();
    }
    else if (response.IncorrectDevice === true)
    {
        app.popups.showIncorrectDevice(response);
    }
    else if (response.InvalidSession === true)
    {
        app.popups.showSessionExpired();
    }
    else if (showAlerts)
    {
        // technically this shouldn't ever happen with requests that come from the app
        if (response.InvalidRequest === true)
        {
            app.popups.showAlert("Unexpected Error", "An unexpected error has occured. Please try again or", true);
        }
        else if (response.IncorrectAPIKey === true)
        {
            app.popups.showAlert("Unable to complete request", "Unable to complete the request. Please try again or", true);
        }
        else if (response.UnknownError === true)
        {
            app.popups.showErrorResponseAlert(response);
        }
    }
}
