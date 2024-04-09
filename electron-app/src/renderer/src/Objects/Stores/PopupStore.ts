import { BaseResponse, IncorrectDeviceResponse } from "@renderer/Types/AccountSetup";
import { AccountSetupModel, AccountSetupView } from "@renderer/Types/Models";
import { Ref, ref } from "vue";
import { stores } from ".";

export type PopupStore = ReturnType<typeof createPopupStore>

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
	const statusCode: Ref<number | undefined> = ref(undefined);
	const logID: Ref<number | undefined> = ref(undefined);
	const axiosCode: Ref<string | undefined> = ref('');

	const incorrectDeviceIsShowing: Ref<boolean> = ref(false);
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

	function addOnEnterHandler(index: number, callback: () => void)
	{
		onEnterHandlers[index] = callback;
	}

	function removeOnEnterHandler(index)
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

		showContactSupport.value = true;
		statusCode.value = response?.StatusCode;
		axiosCode.value = response?.AxiosCode;
		alertIsShowing.value = true;
	}

	function showErrorAlert(logid?: number)
	{
		alertTitle.value = undefined;
		alertMessage.value = undefined;

		showContactSupport.value = true;
		logID.value = logid
		alertIsShowing.value = true;
	}

	function showAlert(title: string, message: string, showContactSupportMessage: boolean)
	{
		logID.value = undefined;
		statusCode.value = undefined;
		axiosCode.value = undefined;

		showContactSupport.value = showContactSupportMessage;
		alertTitle.value = title;
		alertMessage.value = message;
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

		setTimeout(() => toastIsShowing.value = false, 2000);
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
		hideAccountSetup,
		showGlobalAuthWithLockIcon,
		playUnlockAnimation,
		showGlobalAuthentication,
		hideGlobalAuthentication,
		showRequestAuthentication,
		hideRequesetAuthentication,
		showToast
	}
}
