import { BaseResponse, IncorrectDeviceResponse } from "@renderer/Types/AccountSetup";
import { AccountSetupModel, AccountSetupView } from "@renderer/Types/Models";
import { Ref, ref } from "vue";
import { stores } from ".";

export type PopupStore = ReturnType<typeof createPopupStore>

export default function createPopupStore()
{
	const color: Ref<string> = ref('');

	const loadingIndicatorIsShowing: Ref<boolean> = ref(false)
	const loadingText: Ref<string> = ref('');
	const loadingOpacity: Ref<number | undefined> = ref(undefined);

	const unknownErrorIsShowing: Ref<boolean> = ref(false);
	const statusCode: Ref<number | undefined> = ref(undefined);
	const logID: Ref<number | undefined> = ref(undefined);
	const axiosCode: Ref<string | undefined> = ref('');

	const incorrectDeviceIsShowing: Ref<boolean> = ref(false);
	const response: Ref<IncorrectDeviceResponse> = ref({});

	const accountSetupIsShowing: Ref<boolean> = ref(true);
	const accountSetupModel: Ref<AccountSetupModel> = ref({ currentView: AccountSetupView.SignIn });

	const globalAuthIsShowing: Ref<boolean> = ref(false);
	const onlyShowLockIcon: Ref<boolean> = ref(false);
	const playingUnlockAnimation: Ref<boolean> = ref(false);

	const requestAuthenticationIsShowing: Ref<boolean> = ref(false);
	const needsToSetupKey: Ref<boolean> = ref(false);
	const onSuccess: Ref<{ (key: string): void }> = ref(() => { });
	const onCancel: Ref<{ (): void }> = ref(() => { });

	const toastIsShowing: Ref<boolean> = ref(false);
	const toastText: Ref<string> = ref('');
	const toastSuccess: Ref<boolean> = ref(false);

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

	function showErrorResponse(response: BaseResponse)
	{
		statusCode.value = response?.StatusCode;
		axiosCode.value = response?.AxiosCode;
		unknownErrorIsShowing.value = true;
	}

	function showError(logid?: number)
	{
		logID.value = logid
		unknownErrorIsShowing.value = true;
	}

	function hideUnkonwnError()
	{
		unknownErrorIsShowing.value = false;
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
		showAccountSetup(AccountSetupView.SignIn, "Your session has expired. Please sign back in");
	}

	function showAccountSetup(view: AccountSetupView, message?: string)
	{
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

	function showGlobalAuthentication(clr: string)
	{
		color.value = clr;
		globalAuthIsShowing.value = true;
	}

	function hideGlobalAuthentication()
	{
		playingUnlockAnimation.value = false;
		globalAuthIsShowing.value = false;
	}

	function showRequestAuthentication(clr: string, onSucess: (key: string) => void, onCancl: () => void)
	{
		color.value = clr;

		if (!stores.canAuthenticateKeyAfterEntry())
		{
			needsToSetupKey.value = true;
		}
		else
		{
			needsToSetupKey.value = false;
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
		get unknownErrorIsShowing() { return unknownErrorIsShowing.value },
		get statusCode() { return statusCode.value },
		get logID() { return logID.value },
		get axiosCode() { return axiosCode.value },
		get incorrectDeviceIsShowing() { return incorrectDeviceIsShowing.value },
		get response() { return response.value },
		get accountSetupIsShowing() { return accountSetupIsShowing.value },
		get accountSetupModel() { return accountSetupModel.value },
		get globalAuthIsShowing() { return globalAuthIsShowing.value },
		get onlyShowLockIcon() { return onlyShowLockIcon.value },
		get playingUnlockAnimation() { return playingUnlockAnimation.value },
		get requestAuthenticationIsShowing() { return requestAuthenticationIsShowing.value },
		get needsToSetupKey() { return needsToSetupKey.value },
		get onSuccess() { return onSuccess.value },
		get onCancel() { return onCancel.value },
		get toastIsShowing() { return toastIsShowing.value },
		get toastText() { return toastText.value },
		get toastSuccess() { return toastSuccess.value },
		showLoadingIndicator,
		hideLoadingIndicator,
		showErrorResponse,
		showError,
		hideUnkonwnError,
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
