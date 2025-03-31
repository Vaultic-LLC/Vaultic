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
        set l(value: string) { passwordState.l = value; },
        get d() { return passwordState.d; },
        set d(value: string) { passwordState.d = value; },
        get e() { return passwordState.e; },
        set e(value: string) { passwordState.e = value; },
        get p() { return passwordState.p; },
        set p(value: string) { passwordState.p = value; },
        get f() { return passwordState.f; },
        set f(value: string) { passwordState.f = value; },
        get q() { return passwordState.q; },
        get a() { return passwordState.a; },
        set a(value: string) { passwordState.a = value; },
        get t() { return passwordState.t; },
        set t(value: string) { passwordState.t = value; },
        get i() { return passwordState.i; },
        get g() { return passwordState.g; },
        get w() { return passwordState.w; },
        set w(value: boolean) { passwordState.w = value; },
        get m() { return passwordState.m; },
        set m(value: number) { passwordState.m = value; },
        get c() { return passwordState.c; },
        set c(value: boolean) { passwordState.c = value; },
        get v() { return passwordState.v; },
        isOld() { return isOld.value },
    }
}