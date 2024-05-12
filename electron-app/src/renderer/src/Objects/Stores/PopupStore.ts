import { BaseResponse, IncorrectDeviceResponse } from "@renderer/Types/SharedTypes";
import { AccountSetupModel, AccountSetupView, ButtonModel } from "@renderer/Types/Models";
import { Ref, ref } from "vue";
import { stores } from ".";

export type PopupStore = ReturnType<typeof createPopupStore>

type PopupName = "loading" | "alert" | "devicePopup" | "incorrectDevice" | "globalAuth" | "requestAuth" | "accountSetup" |
	"breachedPasswords" | "toast";

interface PopupInfo
{
	zIndex: number;
	enterOrder?: number;
}

type Popups = {
	[key in PopupName]: PopupInfo;
}

export const popups: Popups =
{
	"loading": { zIndex: 200 },
	"alert": { zIndex: 170, enterOrder: 0 },
	"devicePopup": { zIndex: 161 },
	"incorrectDevice": { zIndex: 160, enterOrder: 1 },
	"accountSetup": { zIndex: 150, enterOrder: 2 },
	"globalAuth": { zIndex: 100, enterOrder: 3 },
	"requestAuth": { zIndex: 90, enterOrder: 4 },
	"breachedPasswords": { zIndex: 50 },
	"toast": { zIndex: 20 }
}

export default function createPopupStore()
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
	const logID: Ref<number | undefined> = ref(undefined);
	const axiosCode: Ref<string | undefined> = ref('');

	const incorrectDeviceIsShowing: Ref<boolean> = ref(true);
	const response: Ref<IncorrectDeviceResponse> = ref({});

	const accountSetupIsShowing: Ref<boolean> = ref(true);
	const accountSetupModel: Ref<AccountSetupModel> = ref({ currentView: AccountSetupView.SignIn });

	const globalAuthIsShowing: Ref<boolean> = ref(false);
	const focusGlobalAuthInput: Ref<boolean> = ref(false);
	const onlyShowLockIcon: Ref<boolean> = ref(false);
	const playingUnlockAnimation: Ref<boolean> = ref(false);

	const requestAuthenticationIsShowing: Ref<boolean> = ref(false);
	const needsToSetupKey: Ref<boolean> = ref(false);
	const onSuccess: Ref<{ (key: string): void }> = ref(() => { });
	const onCancel: Ref<{ (): void }> = ref(() => { });

	const toastIsShowing: Ref<boolean> = ref(false);
	const toastText: Ref<string> = ref('');
	const toastSuccess: Ref<boolean> = ref(false);

	const breachedPasswordIsShowing: Ref<boolean> = ref(false);
	const breachedPasswordID: Ref<string> = ref('');

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
		alertMessage.value = undefined;
		alertLeftButton.value = undefined;
		alertRightButton.value = undefined;

		showContactSupport.value = true;
		logID.value = response.logID;
		statusCode.value = response?.statusCode;
		axiosCode.value = response?.axiosCode;
		alertIsShowing.value = true;
	}

	function showErrorAlert(logid?: number)
	{
		alertTitle.value = undefined;
		alertMessage.value = undefined;
		alertLeftButton.value = undefined;
		alertRightButton.value = undefined;

		showContactSupport.value = true;
		logID.value = logid
		alertIsShowing.value = true;
	}

	function showAlert(title: string, message: string, showContactSupportMessage: boolean,
		leftButton?: ButtonModel, rightButton?: ButtonModel)
	{
		logID.value = undefined;
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

	function showIncorrectDevice(rsponse?: IncorrectDeviceResponse)
	{
		response.value = rsponse ?? {};
		incorrectDeviceIsShowing.value = true;
	}

	function hideIncorrectDevice()
	{
		incorrectDeviceIsShowing.value = false;
	}

	function showSessionExpired()
	{
		showAccountSetup(AccountSetupView.SignIn, "Your session has expired. Please re sign in to continue using online functionality, or click 'Continue in Offline Mode'");
	}

	function showAccountSetup(view: AccountSetupView, message?: string)
	{
		if (accountSetupIsShowing.value)
		{
			return;
		}

		accountSetupModel.value.infoMessage = message;
		accountSetupModel.value.currentView = view;
		accountSetupIsShowing.value = true;
	}

	function showPaymentSetup()
	{
		showAccountSetup(AccountSetupView.SetupPayment);
	}

	function hideAccountSetup()
	{
		accountSetupIsShowing.value = false;
	}

	function showGlobalAuthWithLockIcon(clr: string)
	{
		color.value = clr;
		onlyShowLockIcon.value = true;
		globalAuthIsShowing.value = true;
	}

	function playUnlockAnimation()
	{
		playingUnlockAnimation.value = true;
	}

	function showGlobalAuthentication(clr: string, focusInput: boolean)
	{
		color.value = clr;
		onlyShowLockIcon.value = true;
		focusGlobalAuthInput.value = focusInput;
		globalAuthIsShowing.value = true;
	}

	function hideGlobalAuthentication()
	{
		playingUnlockAnimation.value = false;
		globalAuthIsShowing.value = false;
	}

	async function showRequestAuthentication(clr: string, onSucess: (key: string) => void, onCancl: () => void)
	{
		color.value = clr;

		if (!(await stores.appStore.canAuthenticateKey()))
		{
			return;
		}

		onSuccess.value = (key: string) =>
		{
			requestAuthenticationIsShowing.value = false;
			onSucess(key);
		};

		onCancel.value = () =>
		{
			requestAuthenticationIsShowing.value = false;
			onCancl();
		}

		requestAuthenticationIsShowing.value = true;
	}

	function hideRequesetAuthentication()
	{
		requestAuthenticationIsShowing.value = false;
	}

	function showToast(clr: string, text: string, success: boolean)
	{
		color.value = clr;
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
		get logID() { return logID.value },
		get axiosCode() { return axiosCode.value },
		get incorrectDeviceIsShowing() { return incorrectDeviceIsShowing.value },
		get response() { return response.value },
		get accountSetupIsShowing() { return accountSetupIsShowing.value },
		get accountSetupModel() { return accountSetupModel.value },
		get globalAuthIsShowing() { return globalAuthIsShowing.value },
		get focusGlobalAuthInput() { return focusGlobalAuthInput.value },
		get onlyShowLockIcon() { return onlyShowLockIcon.value },
		get playingUnlockAnimation() { return playingUnlockAnimation.value },
		get requestAuthenticationIsShowing() { return requestAuthenticationIsShowing.value },
		get needsToSetupKey() { return needsToSetupKey.value },
		get onSuccess() { return onSuccess.value },
		get onCancel() { return onCancel.value },
		get toastIsShowing() { return toastIsShowing.value },
		get toastText() { return toastText.value },
		get toastSuccess() { return toastSuccess.value },
		get breachedPasswordIsShowing() { return breachedPasswordIsShowing.value },
		get breachedPasswordID() { return breachedPasswordID.value },
		addOnEnterHandler,
		removeOnEnterHandler,
		showLoadingIndicator,
		hideLoadingIndicator,
		showErrorResponseAlert,
		showErrorAlert,
		showAlert,
		hideAlert,
		showIncorrectDevice,
		hideIncorrectDevice,
		showSessionExpired,
		showAccountSetup,
		showPaymentSetup,
		hideAccountSetup,
		showGlobalAuthWithLockIcon,
		playUnlockAnimation,
		showGlobalAuthentication,
		hideGlobalAuthentication,
		showRequestAuthentication,
		hideRequesetAuthentication,
		showToast,
		showBreachedPasswordPopup,
		hideBreachedPasswordPopup
	}
}
