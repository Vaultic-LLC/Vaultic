import { NameValuePair, NameValuePairType } from "../../Types/DataTypes";
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
        set n(value: string) { nameValuePairState.n = value; },
        get v() { return nameValuePairState.v; },
        set v(value: string) { nameValuePairState.v = value; },
        get y() { return nameValuePairState.y; },
        set y(value: NameValuePairType | undefined) { nameValuePairState.y = value; },
        get o() { return nameValuePairState.o; },
        set o(value: boolean) { nameValuePairState.o = value; },
        get a() { return nameValuePairState.a; },
        set a(value: string) { nameValuePairState.a = value; },
        get t() { return nameValuePairState.t; },
        set t(value: string) { nameValuePairState.t = value; },
        get i() { return nameValuePairState.i; },
        get g() { return nameValuePairState.g; },
        get w() { return nameValuePairState.w; },
        set w(value: boolean) { nameValuePairState.w = value; },
        get m() { return nameValuePairState.m; },
        set m(value: number) { nameValuePairState.m = value; },
        isOld() { return isOld.value; },
    };
}
