import { Password } from "../../Types/DataTypes";
import { ComputedRef, computed, reactive } from "vue";
import app from "./AppStore";

export interface ReactivePassword extends Password
{
    isOld: () => boolean;
}

// Used to prevent modifing a password directly and to and some computed methods
export default function createReactivePassword(password: Password): ReactivePassword
{
    const passwordState: Password = reactive({
        ...password
    });

    const isOld: ComputedRef<boolean> = computed(() =>
    {
        const today = new Date().getTime();
        const lastModifiedTime = Date.parse(passwordState.t);
        const differenceInDays = (today - lastModifiedTime) / 1000 / 86400;

        return differenceInDays >= app.settings.o;
    });

    return {
        get id() { return passwordState.id; },
        get l() { return passwordState.l; },
        get d() { return passwordState.d; },
        get e() { return passwordState.e; },
        get p() { return passwordState.p; },
        get f() { return passwordState.f; },
        get q() { return passwordState.q; },
        get a() { return passwordState.a; },
        get t() { return passwordState.t; },
        get i() { return passwordState.i; },
        get g() { return passwordState.g; },
        get w() { return passwordState.w; },
        get m() { return passwordState.m; },
        get c() { return passwordState.c; },
        get v() { return passwordState.v; },
        isOld() { return isOld.value },
    }
}