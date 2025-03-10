import { Field, FieldConstructor } from "@vaultic/shared/Types/Fields";
import { environment } from "../Environment";

class MainFieldConstructorClass extends FieldConstructor
{
    create<T>(value: T): Field<T>
    {
        return Field.create(value, `${Date.now()}+${environment.utilities.generator.uniqueId()}`)
    }
}

export const MainFieldConstructor = new MainFieldConstructorClass();