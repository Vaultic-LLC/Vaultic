import { HideLoadingIndicatorFunctionKey, RequestAuthenticationFunctionKey, ShowLoadingIndicatorFunctionKey } from "@renderer/Types/Keys";
import { inject } from "vue";

export function useRequestAuthFunction(): { (color: string, onSuccess: (key: string) => void, onCancel: () => void): void } | undefined
{
	return inject(RequestAuthenticationFunctionKey, () => { });
}

export function useLoadingIndicator(): [(color: string, text: string) => void, () => void]
{
	return [inject(ShowLoadingIndicatorFunctionKey, () => { }), inject(HideLoadingIndicatorFunctionKey, () => { })]
}
