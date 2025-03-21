import { NameValuePair } from "../../Types/DataTypes";
import { ComputedRef, computed, reactive } from "vue";
import app from "./AppStore";

export interface ReactiveValue extends NameValuePair
{
    isOld: () => boolean;
}

// Used to prevent modifing a value directly and to and some computed methods
export default function createReactiveValue(nameValuePair: NameValuePair): ReactiveValue
{
    const nameValuePairState: NameValuePair = reactive(
        {
            ...nameValuePair,
        });

    const isOld: ComputedRef<boolean> = computed(() =>
    {
        const today = new Date().getTime();
        const lastModifiedTime = Date.parse(nameValuePairState.t);
        const differenceInDays = (today - lastModifiedTime) / 1000 / 86400;

        return differenceInDays >= app.settings.o;
    });


    return {
        get id() { return nameValuePairState.id; },
        get n() { return nameValuePairState.n; },
        get v() { return nameValuePairState.v; },
        get y() { return nameValuePairState.y; },
        get o() { return nameValuePairState.o; },
        get a() { return nameValuePairState.a; },
        get t() { return nameValuePairState.t; },
        get i() { return nameValuePairState.i; },
        get g() { return nameValuePairState.g; },
        get w() { return nameValuePairState.w; },
        get m() { return nameValuePairState.m; },
        get key() { return nameValuePairState.key; },
        isOld() { return isOld.value; },
    };
}
