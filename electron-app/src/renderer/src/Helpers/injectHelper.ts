import { IncorrectDeviceResponse } from "@renderer/Types/AccountSetup";
import { HideLoadingIndicatorFunctionKey, RequestAuthenticationFunctionKey, ShowLoadingIndicatorFunctionKey, ShowToastFunctionKey, ShowUnknownResonsePopupFunctionKey, ShowIncorrectDevicePopupFunctionKey, OnSessionExpiredFunctionKey } from "@renderer/Types/Keys";
import { inject } from "vue";

export function useRequestAuthFunction(): { (color: string, onSuccess: (key: string) => void, onCancel: () => void): void } | undefined
{
	return inject(RequestAuthenticationFunctionKey, () => { });
}

export function useLoadingIndicator(): [(color: string, text: string) => void, () => void]
{
	return [inject(ShowLoadingIndicatorFunctionKey, () => { }), inject(HideLoadingIndicatorFunctionKey, () => { })]
}

export function useToastFunction(): { (color: string, toastText: string, success: boolean): void }
{
	return inject(ShowToastFunctionKey, () => { });
}

export function useUnknownResponsePopup(): { (statusCode?: number, logID?: number): void }
{
	return inject(ShowUnknownResonsePopupFunctionKey, () => { });
}

export function useIncorrectDevicePopup(): { (response: IncorrectDeviceResponse): void }
{
	return inject(ShowIncorrectDevicePopupFunctionKey, () => { });
}

export function useOnSessionExpired(): { (message?: string): void }
{
	return inject(OnSessionExpiredFunctionKey, () => { });
}
