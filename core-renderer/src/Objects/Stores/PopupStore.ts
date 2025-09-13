import { AccountSetupModel, AccountSetupView, ButtonModel } from "../../Types/Models";
import { Ref, ref } from "vue";
import app from "./AppStore";
import { Dictionary } from "@vaultic/shared/Types/DataStructures";
import { DisplayVault } from "@vaultic/shared/Types/Entities";
import { BaseResponse } from "@vaultic/shared/Types/Responses";
import { ImportableDisplayField } from "../../Types/Fields";
import { DataType } from "../../Types/DataTypes";
import { Organization } from "@vaultic/shared/Types/DataTypes";
import { ClientDevice } from "@vaultic/shared/Types/Device";
import { api } from "../../API";

export type PopupStore = ReturnType<typeof createPopupStore>

export enum PopupNames 
{
    VerifyEmail = "verifyEmail",
    Loading = "loading",
    Alert = "alert",
    DevicePopup = "devicePopup",
    GlobalAuth = "globalAuth",
    RequestAuth = "requestAuth",
    EnterMFACode = "enterMFACode",
    AccountSetup = "accountSetup",
    BreachedPaswords = "breachedPasswords",
    Toast = "toast",
    ImportSelection = "importSelection",
    DefaultObjectPopup = "defaultObjectPopup",
    EmergencyDeactivaion = "emergencyDeactivation"
};

interface PopupInfo
{
    zIndex: number;
    enterOrder?: number;
}

export type Popups = {
    [key in PopupNames]: PopupInfo;
}

export const popups: Popups =
{
    "loading": { zIndex: 2000 },
    "alert": { zIndex: 1990, enterOrder: 0 },
    "verifyEmail": { zIndex: 1500, enterOrder: 0 },
    "devicePopup": { zIndex: 161 },
    "enterMFACode": { zIndex: 1600, enterOrder: 1 },
    "toast": { zIndex: 1700 },
    "emergencyDeactivation": { zIndex: 1550 },
    "accountSetup": { zIndex: 1500, enterOrder: 2 },
    "globalAuth": { zIndex: 100, enterOrder: 3 },
    "requestAuth": { zIndex: 90, enterOrder: 4 },
    "breachedPasswords": { zIndex: 50 },
    "importSelection": { zIndex: 10 },
    "defaultObjectPopup": { zIndex: 7, enterOrder: 5 }
}

export function createPopupStore()
{
    const onEnterHandlers: ({ (): void } | undefined)[] = [];
    const color: Ref<string> = ref('');

    const loadingIndicatorIsShowing: Ref<boolean> = ref(false)
    const loadingText: Ref<string> = ref('');
    const loadingOpacity: Ref<number | undefined> = ref(undefined);

    const alertIsShowing: Ref<boolean> = ref(false);
    const showContactSupport: Ref<boolean> = ref(false);
    const alertTitle: Ref<string | undefined> = ref(undefined);
    const alertMessage: Ref<string | undefined> = ref(undefined);
    const alertLeftButton: Ref<ButtonModel | undefined> = ref(undefined);
    const alertRightButton: Ref<ButtonModel | undefined> = ref(undefined);
    const statusCode: Ref<number | undefined> = ref(undefined);
    const axiosCode: Ref<string | undefined> = ref('');

    const accountSetupIsShowing: Ref<boolean> = ref(true);
    const accountSetupModel: Ref<AccountSetupModel> = ref({ currentView: AccountSetupView.SignIn });

    const requestAuthenticationIsShowing: Ref<boolean> = ref(false);
    const needsToSetupKey: Ref<boolean> = ref(false);
    const onSuccess: Ref<{ (key: string): void }> = ref(() => { });
    const onCancel: Ref<{ (): void }> = ref(() => { });

    const toastIsShowing: Ref<boolean> = ref(false);
    const toastText: Ref<string> = ref('');
    const toastSuccess: Ref<boolean> = ref(false);

    const breachedPasswordIsShowing: Ref<boolean> = ref(false);
    const breachedPasswordID: Ref<string> = ref('');

    const importPopupIsShowing: Ref<boolean> = ref(false);
    const csvImportHeaders: Ref<string[]> = ref([]);
    const importProperties: Ref<ImportableDisplayField[]> = ref([]);
    const onImportConfirmed: Ref<(masterKey: string, columnIndexToProperty: Dictionary<ImportableDisplayField[]>) => Promise<void>> =
        ref(async (_, __) => { });

    const vaultPopupIsShowing: Ref<boolean> = ref(false);
    const onVaultPopupClose: Ref<(saved: boolean) => void> = ref((_) => { });
    const vaultModel: Ref<DisplayVault | undefined> = ref(undefined);

    const organizationPopupIsShowing: Ref<boolean> = ref(false);
    const onOrganizationPopupClose: Ref<(saved: boolean) => void> = ref((_) => { });
    const organizationModel: Ref<Organization | undefined> = ref(undefined);

    const addDataTypePopupIsShowing: Ref<boolean> = ref(false);
    const initialAddDataTypePopupContent: Ref<DataType | undefined> = ref();

    const emergencyDeactivationIsShowing: Ref<boolean> = ref(false);

    const clearDataBreachesIsShowing: Ref<boolean> = ref(false);

    const showMFAKeyIsShowing: Ref<boolean> = ref(false);

    const devicePopupIsShowing: Ref<boolean> = ref(false);
    const deviceModel: Ref<ClientDevice | undefined> = ref(undefined);

    const syncingPopupIsShowing: Ref<boolean> = ref(false);
    const syncingPopupIsFinished: Ref<boolean> = ref(false);

    const verifyEmailPopupIsShowing: Ref<boolean> = ref(false);
    const onVerifyEmailPopupClose: Ref<() => void> = ref(() => { });
    const onVerifyEmailPopupSuccess: Ref<() => void> = ref(() => { });

    const deleteAccountPopupIsShowing: Ref<boolean> = ref(false);

    function addOnEnterHandler(index: number, callback: () => void)
    {
        onEnterHandlers[index] = callback;
    }

    function removeOnEnterHandler(index: number)
    {
        onEnterHandlers[index] = undefined;
    }

    window.addEventListener("keyup", (e: KeyboardEvent) =>
    {
        if (e.key == 'Enter')
        {
            for (let i = 0; i < onEnterHandlers.length; i++)
            {
                if (onEnterHandlers[i])
                {
                    (onEnterHandlers[i] as () => void)();
                    return;
                }
            }
        }
    });

    // all the popups that are user specific that should be closed if the user locks the app in case a 
    // different user logs in after
    function closeAllPopupsOnLock()
    {
        alertIsShowing.value = false;
        requestAuthenticationIsShowing.value = false;
        breachedPasswordIsShowing.value = false;
        importPopupIsShowing.value = false;
        vaultPopupIsShowing.value = false;
        organizationPopupIsShowing.value = false;
        addDataTypePopupIsShowing.value = false;
        emergencyDeactivationIsShowing.value = false;
        clearDataBreachesIsShowing.value = false;
        showMFAKeyIsShowing.value = false;
        devicePopupIsShowing.value = false;
    }

    function showLoadingIndicator(clr: string, text?: string, opacity?: number)
    {
        color.value = clr;
        loadingText.value = text ?? "";
        loadingOpacity.value = opacity;
        loadingIndicatorIsShowing.value = true;
    }

    function hideLoadingIndicator()
    {
        loadingIndicatorIsShowing.value = false;
    }

    function showErrorResponseAlert(response: BaseResponse)
    {
        alertTitle.value = undefined;
        alertMessage.value = response.message;
        alertLeftButton.value = undefined;
        alertRightButton.value = undefined;

        showContactSupport.value = true;
        statusCode.value = response?.statusCode;
        axiosCode.value = response?.axiosCode;
        alertIsShowing.value = true;
    }

    function showErrorAlert()
    {
        alertTitle.value = undefined;
        alertMessage.value = undefined;
        alertLeftButton.value = undefined;
        alertRightButton.value = undefined;

        showContactSupport.value = true;
        alertIsShowing.value = true;
    }

    function showAlert(title: string, message: string, showContactSupportMessage: boolean,
        leftButton?: ButtonModel, rightButton?: ButtonModel)
    {
        statusCode.value = undefined;
        axiosCode.value = undefined;

        showContactSupport.value = showContactSupportMessage;
        alertTitle.value = title;
        alertMessage.value = message;
        alertLeftButton.value = leftButton;
        alertRightButton.value = rightButton;
        alertIsShowing.value = true;
    }

    function hideAlert()
    {
        alertIsShowing.value = false;
    }

    function showSessionExpired()
    {
        app.lock(false, false, false);
        showAccountSetup(AccountSetupView.SignIn, "Your session has expired. Please re sign in to continue using online functionality, or click 'Continue in Offline Mode'", undefined, false);
    }

    function showAccountSetup(view: AccountSetupView, message?: string, reloadAllDataIsToggled: boolean = false, clearAllData: boolean = true)
    {
        accountSetupModel.value.reloadAllDataIsToggled = reloadAllDataIsToggled;
        accountSetupModel.value.infoMessage = message;
        accountSetupModel.value.currentView = view;
        accountSetupModel.value.clearAllDataOnLoad = clearAllData;
        accountSetupIsShowing.value = true;
    }

    function showPaymentSetup()
    {
        accountSetupModel.value.currentView = AccountSetupView.SetupPayment;
        accountSetupIsShowing.value = true;
    }

    function hideAccountSetup()
    {
        accountSetupModel.value.reloadAllDataIsToggled = false;
        accountSetupModel.value.infoMessage = "";
        accountSetupIsShowing.value = false;
    }

    async function showRequestAuthentication(clr: string, doOnSucess: (key: string) => void, doOnCancl: () => void, isSensitive: boolean = false)
    {
        if (!isSensitive || !app.settings.q)
        {
            const key: string | undefined = await api.repositories.users.getValidMasterKey();
            if (key)
            {
                doOnSucess(key);
                return;
            }
        }

        color.value = clr;
        onSuccess.value = (key: string) =>
        {
            requestAuthenticationIsShowing.value = false;
            doOnSucess(key);
        };

        onCancel.value = () =>
        {
            requestAuthenticationIsShowing.value = false;
            doOnCancl();
        }

        requestAuthenticationIsShowing.value = true;
    }

    function hideRequesetAuthentication()
    {
        requestAuthenticationIsShowing.value = false;
    }

    function showToast(text: string, success: boolean)
    {
        toastText.value = text;
        toastSuccess.value = success;
        toastIsShowing.value = true;

        setTimeout(() => toastIsShowing.value = false, 3000);
    }

    function showBreachedPasswordPopup(passwordID: string)
    {
        breachedPasswordID.value = passwordID;
        breachedPasswordIsShowing.value = true;
    }

    function hideBreachedPasswordPopup()
    {
        breachedPasswordIsShowing.value = false;
    }

    function showImportPopup(clr: string, csvHdrs: string[], props: ImportableDisplayField[],
        onConfirm: (masterKey: string, columnIndexToProperty: Dictionary<ImportableDisplayField[]>) => Promise<void>)
    {
        csvImportHeaders.value = csvHdrs;
        color.value = clr;
        importProperties.value = props;
        onImportConfirmed.value = onConfirm;
        importPopupIsShowing.value = true;
    }

    function hideImportPopup()
    {
        csvImportHeaders.value = [];
        importProperties.value = [];
        onImportConfirmed.value = async () => { };
        importPopupIsShowing.value = false;
    }

    function showVaultPopup(onClose: (saved: boolean) => void, model?: DisplayVault)
    {
        vaultModel.value = model;
        onVaultPopupClose.value = (saved: boolean) => 
        {
            vaultPopupIsShowing.value = false;
            onClose(saved);
        };

        vaultPopupIsShowing.value = true;
    }

    function showOrganizationPopup(onClose: (saved: boolean) => void, model?: Organization)
    {
        organizationModel.value = model;
        onOrganizationPopupClose.value = (saved: boolean) => 
        {
            organizationPopupIsShowing.value = false;
            onClose(saved);
        };

        organizationPopupIsShowing.value = true;
    }

    function showAddDataTypePopup(initialActiveContent: DataType)
    {
        initialAddDataTypePopupContent.value = initialActiveContent;
        addDataTypePopupIsShowing.value = true;
    }

    function hideAddDataTypePopup()
    {
        initialAddDataTypePopupContent.value = undefined;
        addDataTypePopupIsShowing.value = false;
    }

    function showEmergencyDeactivationPopup()
    {
        emergencyDeactivationIsShowing.value = true;
    }

    function hideEmergencyDeactivationPopup()
    {
        emergencyDeactivationIsShowing.value = false;
    }

    function showClearDataBreachesPopup()
    {
        clearDataBreachesIsShowing.value = true;
    }

    function hideClearDataBreachesPopup()
    {
        clearDataBreachesIsShowing.value = false;
    }

    function showMFAKeyPopup()
    {
        showMFAKeyIsShowing.value = true;
    }

    function hideMFAKeyPopup()
    {
        showMFAKeyIsShowing.value = false;
    }

    function showDevicePopup(device?: ClientDevice)
    {
        deviceModel.value = device;
        devicePopupIsShowing.value = true;
    }

    function hideDevicePopup()
    {
        deviceModel.value = undefined;
        devicePopupIsShowing.value = false;
    }

    function showSyncingPopup()
    {
        syncingPopupIsShowing.value = true;
    }

    function finishSyncingPopup()
    {
        syncingPopupIsFinished.value = true;
    }

    function hideSyncingPopup()
    {
        syncingPopupIsShowing.value = false;
        setTimeout(() => syncingPopupIsFinished.value = false, 100);
    }

    function showVerifyEmailPopup(popupColor: string, onClose: () => void, onSuccess: () => void)
    {
        color.value = popupColor;
        onVerifyEmailPopupClose.value = () =>
        {
            verifyEmailPopupIsShowing.value = false;
            onClose();
        };

        onVerifyEmailPopupSuccess.value = () =>
        {
            verifyEmailPopupIsShowing.value = false;
            onSuccess();
        };

        verifyEmailPopupIsShowing.value = true;
    }

    function showDeleteAccountPopup()
    {
        deleteAccountPopupIsShowing.value = true;
    }

    function hideDeleteAccountPopup()
    {
        deleteAccountPopupIsShowing.value = false;

    }

    return {
        get color() { return color.value },
        get loadingIndicatorIsShowing() { return loadingIndicatorIsShowing.value },
        get loadingText() { return loadingText.value },
        get loadingOpacity() { return loadingOpacity.value },
        get alertIsShowing() { return alertIsShowing.value },
        get showContactSupport() { return showContactSupport.value },
        get alertTitle() { return alertTitle.value },
        get alertMessage() { return alertMessage.value },
        get alertLeftButton() { return alertLeftButton.value; },
        get alertRightButton() { return alertRightButton.value; },
        get statusCode() { return statusCode.value },
        get axiosCode() { return axiosCode.value },
        get accountSetupIsShowing() { return accountSetupIsShowing.value },
        get accountSetupModel() { return accountSetupModel.value },
        get requestAuthenticationIsShowing() { return requestAuthenticationIsShowing.value },
        get needsToSetupKey() { return needsToSetupKey.value },
        get onSuccess() { return onSuccess.value },
        get onCancel() { return onCancel.value },
        get toastIsShowing() { return toastIsShowing.value },
        get toastText() { return toastText.value },
        get toastSuccess() { return toastSuccess.value },
        get breachedPasswordIsShowing() { return breachedPasswordIsShowing.value },
        get breachedPasswordID() { return breachedPasswordID.value },
        get importPopupIsShowing() { return importPopupIsShowing.value; },
        get csvImportHeaders() { return csvImportHeaders.value; },
        get importProperties() { return importProperties.value; },
        get onImportConfirmed() { return onImportConfirmed.value; },
        get vaultPopupIsShowing() { return vaultPopupIsShowing.value; },
        get vaultModel() { return vaultModel.value },
        get onVaultPopupClose() { return onVaultPopupClose.value; },
        get organizationPopupIsShowing() { return organizationPopupIsShowing.value; },
        get organizationModel() { return organizationModel.value },
        get onOrganizationPopupClose() { return onOrganizationPopupClose.value; },
        get addDataTypePopupIsShowing() { return addDataTypePopupIsShowing.value; },
        get initialAddDataTypePopupContent() { return initialAddDataTypePopupContent.value; },
        get emergencyDeactivationIsShowing() { return emergencyDeactivationIsShowing.value; },
        get clearDataBreachesIsShowing() { return clearDataBreachesIsShowing.value; },
        get showMFAKeyIsShowing() { return showMFAKeyIsShowing.value },
        get devicePopupIsShowing() { return devicePopupIsShowing.value; },
        get deviceModel() { return deviceModel.value; },
        get syncingPopupIsShowing() { return syncingPopupIsShowing.value },
        get syncingPopupIsFinished() { return syncingPopupIsFinished },
        get verifyEmailPopupIsShowing() { return verifyEmailPopupIsShowing.value },
        get onVerifyEmailPopupClose() { return onVerifyEmailPopupClose.value },
        get onVerifyEmailPopupSuccess() { return onVerifyEmailPopupSuccess.value },
        get deleteAccountPopupIsShowing() { return deleteAccountPopupIsShowing.value },
        closeAllPopupsOnLock,
        addOnEnterHandler,
        removeOnEnterHandler,
        showLoadingIndicator,
        hideLoadingIndicator,
        showErrorResponseAlert,
        showErrorAlert,
        showAlert,
        hideAlert,
        showSessionExpired,
        showAccountSetup,
        showPaymentSetup,
        hideAccountSetup,
        showRequestAuthentication,
        hideRequesetAuthentication,
        showToast,
        showBreachedPasswordPopup,
        hideBreachedPasswordPopup,
        showImportPopup,
        hideImportPopup,
        showVaultPopup,
        showOrganizationPopup,
        showAddDataTypePopup,
        hideAddDataTypePopup,
        showEmergencyDeactivationPopup,
        hideEmergencyDeactivationPopup,
        showClearDataBreachesPopup,
        hideClearDataBreachesPopup,
        showMFAKeyPopup,
        hideMFAKeyPopup,
        showDevicePopup,
        hideDevicePopup,
        showSyncingPopup,
        finishSyncingPopup,
        hideSyncingPopup,
        showVerifyEmailPopup,
        showDeleteAccountPopup,
        hideDeleteAccountPopup
    }
}