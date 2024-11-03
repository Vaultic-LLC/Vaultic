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
        const lastModifiedTime = Date.parse(passwordState.lastModifiedTime.value);
        const differenceInDays = (today - lastModifiedTime) / 1000 / 86400;

        return differenceInDays >= app.settings.value.oldPasswordDays.value;
    });

    return {
        get id() { return passwordState.id; },
        get login() { return passwordState.login; },
        get domain() { return passwordState.domain; },
        get email() { return passwordState.email; },
        get password() { return passwordState.password; },
        get passwordFor() { return passwordState.passwordFor; },
        get securityQuestions() { return passwordState.securityQuestions; },
        get additionalInformation() { return passwordState.additionalInformation; },
        get lastModifiedTime() { return passwordState.lastModifiedTime; },
        get filters() { return passwordState.filters; },
        get groups() { return passwordState.groups; },
        get isWeak() { return passwordState.isWeak; },
        get isWeakMessage() { return passwordState.isWeakMessage; },
        get containsLogin() { return passwordState.containsLogin; },
        get passwordLength() { return passwordState.passwordLength; },
        get isVaultic() { return passwordState.isVaultic; },
        isOld() { return isOld.value },
    }
}