import { PropType } from "vue";

type PropOptions<T = any> =
    {
        validator?(value: T): boolean;
    };

export type RequiredProp<T> = {
    type: PropType<T>;
    required: true;
    validator?(value: unknown): boolean;
};

export function VueProp<T>(type: PropType<T> = Object, options?: PropOptions<T>): RequiredProp<T>
{
    const prop =
    {
        type: type as unknown as () => T,
        required: true as true,
        default: null,
        validator: options?.validator
    };

    return prop;
}