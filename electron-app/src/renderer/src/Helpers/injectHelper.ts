import { HideLoadingIndicatorFunctionKey, RequestAuthenticationFunctionKey, ShowLoadingIndicatorFunctionKey, ShowToastFunctionKey, ShowUnknownResonsePopupFunctionKey, ShowErrorContainerFunctionKey } from "@renderer/Types/Keys";
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

export function useUnknownResponsePopup(): { (statusCode?: number): void }
{
	return inject(ShowUnknownResonsePopupFunctionKey, () => { });
}
