import { Field, IFieldedObject } from "@vaultic/shared/Types/Fields";

export const defaultInputColor = "#9e9e9e";
export const defaultInputTextColor: string = "#e8e8e8"

export interface RGBColor
{
    r: number;
    g: number;
    b: number;
    alpha: number;
}

export interface TableColorScheme extends IFieldedObject
{
    primaryColor: Field<string>;
    secondaryColorOne: Field<string>;
    secondaryColorTwo: Field<string>;
}

export interface ColorPalette extends IFieldedObject
{
    id: Field<string>;
    active: Field<boolean>;
    isCreated: Field<boolean>;
    editable: Field<boolean>;
    passwordsColor: Field<TableColorScheme>;
    valuesColor: Field<TableColorScheme>;
    filtersColor: Field<string>;
    groupsColor: Field<string>;
    backgroundColor: Field<string>;
    tableColor: Field<string>;
    widgetColor: Field<string>;
    errorColor: Field<string>;
    successColor: Field<string>;
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

export const defaultColorPalettes: Map<string, Field<ColorPalette>> = new Map([
    ["m84ezgwm3", Field.create({
        id: Field.create("m84ezgwm3"),
        active: Field.create(false),
        isCreated: Field.create(true),
        editable: Field.create(false),
        passwordsColor: Field.create({
            id: Field.create("m84ezgwm5"),
            primaryColor: Field.create("#bb29ff"),
            secondaryColorOne: Field.create("#6612ec"),
            secondaryColorTwo: Field.create("#2419bf"),
        }),
        valuesColor: Field.create({
            id: Field.create("m84ezgwm6"),
            primaryColor: Field.create("#03C4A1"),
            secondaryColorOne: Field.create("#03a7c4"),
            secondaryColorTwo: Field.create("#0374c4"),
        }),
        filtersColor: Field.create("#7752FE"),
        groupsColor: Field.create("#19A7CE"),
        backgroundColor: Field.create("#0f111d"),
        tableColor: Field.create("#161e29"),
        widgetColor: Field.create("#2c2c3329"),
        errorColor: Field.create("#ef4444"),
        successColor: Field.create("#45d741")
    })],
    ["m84ezgwm7", Field.create({
        id: Field.create("m84ezgwm7"),
        active: Field.create(true),
        isCreated: Field.create(true),
        editable: Field.create(false),
        passwordsColor: Field.create({
            id: Field.create("m84ezgwm8"),
            primaryColor: Field.create("#9A031E"),
            secondaryColorOne: Field.create("#a712ec"),
            secondaryColorTwo: Field.create("#530101"),
        }),
        valuesColor: Field.create({
            id: Field.create("m84ezgwn0"),
            primaryColor: Field.create("#BF3131"),
            secondaryColorOne: Field.create("#5d0ca6"),
            secondaryColorTwo: Field.create("#a712ec"),
        }),
        filtersColor: Field.create("#FB8B24"),
        groupsColor: Field.create("#E36414"),
        backgroundColor: Field.create("#0f111d"),
        tableColor: Field.create("#161e29"),
        widgetColor: Field.create("#2c2c3329"),
        errorColor: Field.create("#ef4444"),
        successColor: Field.create("#45d741")
    })],
    ["m84ezgwn1", Field.create({
        id: Field.create("m84ezgwn1"),
        active: Field.create(false),
        isCreated: Field.create(true),
        editable: Field.create(false),
        passwordsColor: Field.create({
            id: Field.create("m84ezgwn2"),
            primaryColor: Field.create("#777777"),
            secondaryColorOne: Field.create("#bbbbbb"),
            secondaryColorTwo: Field.create("#111111"),
        }),
        valuesColor: Field.create({
            id: Field.create("m84ezgwn3"),
            primaryColor: Field.create("#888888"),
            secondaryColorOne: Field.create("#bbbbbb"),
            secondaryColorTwo: Field.create("#111111"),
        }),
        filtersColor: Field.create("#a9b3bb"),
        groupsColor: Field.create("#8e9a98"),
        backgroundColor: Field.create("#0f111d"),
        tableColor: Field.create("#161e29"),
        widgetColor: Field.create("#2c2c3329"),
        errorColor: Field.create("#FFFFFF"),
        successColor: Field.create("#FFFFFF")
    })]
]);

export const emptyUserColorPalettes: Map<string, Field<ColorPalette>> = new Map([
    ["m84ezgwn4", Field.create({
        id: Field.create("m84ezgwn4"),
        active: Field.create(false),
        isCreated: Field.create(false),
        editable: Field.create(false),
        passwordsColor: Field.create({
            id: Field.create("m84ezgwn5"),
            primaryColor: Field.create(""),
            secondaryColorOne: Field.create(""),
            secondaryColorTwo: Field.create(""),
        }),
        valuesColor: Field.create({
            id: Field.create("m84ezgwn6"),
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
    })],
    ["m84ezgwn7", Field.create({
        id: Field.create("m84ezgwn7"),
        active: Field.create(false),
        isCreated: Field.create(false),
        editable: Field.create(false),
        passwordsColor: Field.create({
            id: Field.create("m84ezgwn8"),
            primaryColor: Field.create(""),
            secondaryColorOne: Field.create(""),
            secondaryColorTwo: Field.create(""),
        }),
        valuesColor: Field.create({
            id: Field.create("m84ezgwn9"),
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
    })],
    ["m84ezgwn10", Field.create({
        id: Field.create("m84ezgwn10"),
        active: Field.create(false),
        isCreated: Field.create(false),
        editable: Field.create(false),
        passwordsColor: Field.create({
            id: Field.create("m84ezgwn11"),
            primaryColor: Field.create(""),
            secondaryColorOne: Field.create(""),
            secondaryColorTwo: Field.create(""),
        }),
        valuesColor: Field.create({
            id: Field.create("m84ezgwn12"),
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
    })]
]);