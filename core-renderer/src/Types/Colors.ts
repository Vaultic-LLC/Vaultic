import { ColorPalette } from "@vaultic/shared/Types/Color";
import { Field } from "@vaultic/shared/Types/Fields";

export const defaultInputColor = "#9e9e9e";
export const defaultInputTextColor: string = "#e8e8e8"

export interface RGBColor
{
    r: number;
    g: number;
    b: number;
    alpha: number;
}

export const emptyColorPalette: ColorPalette =
{
    id: Field.create("m84ezgwm0"),
    active: Field.create(false),
    isCreated: Field.create(false),
    editable: Field.create(false),
    passwordsColor: Field.create({
        id: Field.create("m84ezgwm1"),
        primaryColor: Field.create(""),
        secondaryColorOne: Field.create(""),
        secondaryColorTwo: Field.create(""),
    }),
    valuesColor: Field.create({
        id: Field.create("m84ezgwm2"),
        primaryColor: Field.create(""),
        secondaryColorOne: Field.create(""),
        secondaryColorTwo: Field.create(""),
    }),
    filtersColor: Field.create(""),
    groupsColor: Field.create(""),
    backgroundColor: Field.create("#0f111d"),
    tableColor: Field.create("#161e29"),
    widgetColor: Field.create("#2c2c3329"),
    errorColor: Field.create(""),
    successColor: Field.create("")
}