import errorCodes from "@vaultic/shared/Types/ErrorCodes";
import app from "../Objects/Stores/AppStore";
import { AccountSetupView } from "../Types/Models";

export function defaultHandleFailedResponse(response: any, showAlerts: boolean = true)
{
    if (response?.errorCode && errorCodes.verificationFailed(response.errorCode))
    {
        app.popups.showAccountSetup(AccountSetupView.SignIn, undefined, true);
        app.popups.showAlert("Unable To Verify Local Data",
            "We have detected that your local data has been unexpectedly modified. For security, the last known backup will need to be restored. Please re sign in to load your last backup.",
            false);
    }
    else if (response.InvalidLicense === true)
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