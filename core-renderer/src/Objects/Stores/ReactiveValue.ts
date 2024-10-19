import { NameValuePair } from "../../Types/DataTypes";
import { ComputedRef, computed, reactive } from "vue";
import app from "./AppStore";
import { Field } from "../../Types/Fields";

export interface ReactiveValue extends NameValuePair
{
    isOld: () => boolean;
    isSafe: () => boolean;
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
        const lastModifiedTime = Date.parse(nameValuePairState.lastModifiedTime.value);
        const differenceInDays = (today - lastModifiedTime) / 1000 / 86400;

        return differenceInDays >= app.settings.oldPasswordDays;
    });

    const isSafe: ComputedRef<boolean> = computed(() => !isOld.value && !nameValuePairState.isDuplicate && !nameValuePairState.isWeak)

    return {
        get id() { return nameValuePairState.id; },
        get name() { return nameValuePairState.name; },
        //set name(value: string) { nameValuePairState.name = value; },
        get value() { return nameValuePairState.value; },
        get valueType() { return nameValuePairState.valueType; },
        get notifyIfWeak() { return nameValuePairState.notifyIfWeak; },
        get additionalInformation() { return nameValuePairState.additionalInformation; },
        get lastModifiedTime() { return nameValuePairState.lastModifiedTime; },
        get filters() { return nameValuePairState.filters; },
        get groups() { return nameValuePairState.groups; },
        get isDuplicate() { return nameValuePairState.isDuplicate; },
        set isDuplicate(value: Field<boolean>) { nameValuePairState.isDuplicate = value; },
        get isWeak() { return nameValuePairState.isWeak; },
        get isWeakMessage() { return nameValuePairState.isWeakMessage; },
        get valueLength() { return nameValuePairState.valueLength; },
        get key() { return nameValuePairState.key; },
        isOld() { return isOld.value; },
        isSafe() { return isSafe.value },
    };
}
