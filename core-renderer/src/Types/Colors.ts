import { Field, FieldedObject } from "@vaultic/shared/Types/Fields";

export const defaultInputColor = "#9e9e9e";
export const defaultInputTextColor: string = "#e8e8e8"

export interface RGBColor
{
    r: number;
    g: number;
    b: number;
    alpha: number;
}

export interface TableColorScheme extends FieldedObject
{
    primaryColor: Field<string>;
    secondaryColorOne: Field<string>;
    secondaryColorTwo: Field<string>;
}

export interface ColorPalette extends FieldedObject
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
}

export const emptyColorPalette: ColorPalette =
{
    id: new Field("DE9AB3B7-C861-4FF3-8900-EAE3ED9DA123"),
    active: new Field(false),
    isCreated: new Field(false),
    editable: new Field(false),
    passwordsColor: new Field({
        id: new Field(""),
        primaryColor: new Field(""),
        secondaryColorOne: new Field(""),
        secondaryColorTwo: new Field(""),
    }),
    valuesColor: new Field({
        id: new Field(""),
        primaryColor: new Field(""),
        secondaryColorOne: new Field(""),
        secondaryColorTwo: new Field(""),
    }),
    filtersColor: new Field(""),
    groupsColor: new Field(""),
    backgroundColor: new Field("#0f111d"),
    tableColor: new Field("#161e29"),
    widgetColor: new Field("#2c2c3329")
}

export const colorPalettes: Map<string, Field<ColorPalette>> = new Map([
    ["EEA4135C-DE25-4B47-B678-486E2D64F675", new Field({
        id: new Field("EEA4135C-DE25-4B47-B678-486E2D64F675"),
        active: new Field(false),
        isCreated: new Field(true),
        editable: new Field(false),
        passwordsColor: new Field({
            id: new Field(""),
            primaryColor: new Field("#bb29ff"),
            secondaryColorOne: new Field("#6612ec"),
            secondaryColorTwo: new Field("#2419bf"),
        }),
        valuesColor: new Field({
            id: new Field(""),
            primaryColor: new Field("#03C4A1"),
            secondaryColorOne: new Field("#03a7c4"),
            secondaryColorTwo: new Field("#0374c4"),
        }),
        filtersColor: new Field("#7752FE"),
        groupsColor: new Field("#19A7CE"),
        backgroundColor: new Field("#0f111d"),
        tableColor: new Field("#161e29"),
        widgetColor: new Field("#2c2c3329")
    })],
    ["26BBFA34-E38F-4754-8413-4F9A2F6C7997", new Field({
        id: new Field("26BBFA34-E38F-4754-8413-4F9A2F6C7997"),
        active: new Field(true),
        isCreated: new Field(true),
        editable: new Field(false),
        passwordsColor: new Field({
            id: new Field(""),
            primaryColor: new Field("#9A031E"),
            secondaryColorOne: new Field("#a712ec"),
            secondaryColorTwo: new Field("#530101"),
        }),
        valuesColor: new Field({
            id: new Field(""),
            primaryColor: new Field("#BF3131"),
            secondaryColorOne: new Field("#5d0ca6"),
            secondaryColorTwo: new Field("#a712ec"),
        }),
        filtersColor: new Field("#FB8B24"),
        groupsColor: new Field("#E36414"),
        backgroundColor: new Field("#0f111d"),
        tableColor: new Field("#161e29"),
        widgetColor: new Field("#2c2c3329")
    })],
    ["4EFC4459-D9C8-45A2-A43D-87884E73CCB6", new Field({
        id: new Field("4EFC4459-D9C8-45A2-A43D-87884E73CCB6"),
        active: new Field(false),
        isCreated: new Field(true),
        editable: new Field(false),
        passwordsColor: new Field({
            id: new Field(""),
            primaryColor: new Field("#777777"),
            secondaryColorOne: new Field("#bbbbbb"),
            secondaryColorTwo: new Field("#111111"),
        }),
        valuesColor: new Field({
            id: new Field(""),
            primaryColor: new Field("#888888"),
            secondaryColorOne: new Field("#bbbbbb"),
            secondaryColorTwo: new Field("#111111"),
        }),
        filtersColor: new Field("#a9b3bb"),
        groupsColor: new Field("#8e9a98"),
        backgroundColor: new Field("#0f111d"),
        tableColor: new Field("#161e29"),
        widgetColor: new Field("#2c2c3329")
    })],
    ["EDD79A67-A9D0-48B8-B895-D1FD7DFA6180", new Field({
        id: new Field("EDD79A67-A9D0-48B8-B895-D1FD7DFA6180"),
        active: new Field(false),
        isCreated: new Field(false),
        editable: new Field(false),
        passwordsColor: new Field({
            id: new Field(""),
            primaryColor: new Field(""),
            secondaryColorOne: new Field(""),
            secondaryColorTwo: new Field(""),
        }),
        valuesColor: new Field({
            id: new Field(""),
            primaryColor: new Field(""),
            secondaryColorOne: new Field(""),
            secondaryColorTwo: new Field(""),
        }),
        filtersColor: new Field(""),
        groupsColor: new Field(""),
        backgroundColor: new Field("#0f111d"),
        tableColor: new Field("#161e29"),
        widgetColor: new Field("#2c2c3329")
    })],
    ["343CD217-7910-4ED6-A93E-3C78957040C9", new Field({
        id: new Field("343CD217-7910-4ED6-A93E-3C78957040C9"),
        active: new Field(false),
        isCreated: new Field(false),
        editable: new Field(false),
        passwordsColor: new Field({
            id: new Field(""),
            primaryColor: new Field(""),
            secondaryColorOne: new Field(""),
            secondaryColorTwo: new Field(""),
        }),
        valuesColor: new Field({
            id: new Field(""),
            primaryColor: new Field(""),
            secondaryColorOne: new Field(""),
            secondaryColorTwo: new Field(""),
        }),
        filtersColor: new Field(""),
        groupsColor: new Field(""),
        backgroundColor: new Field("#0f111d"),
        tableColor: new Field("#161e29"),
        widgetColor: new Field("#2c2c3329")
    })],
    ["5083AB8E-26B7-4FD9-9C48-8939D41625F4", new Field({
        id: new Field("5083AB8E-26B7-4FD9-9C48-8939D41625F4"),
        active: new Field(false),
        isCreated: new Field(false),
        editable: new Field(false),
        passwordsColor: new Field({
            id: new Field(""),
            primaryColor: new Field(""),
            secondaryColorOne: new Field(""),
            secondaryColorTwo: new Field(""),
        }),
        valuesColor: new Field({
            id: new Field(""),
            primaryColor: new Field(""),
            secondaryColorOne: new Field(""),
            secondaryColorTwo: new Field(""),
        }),
        filtersColor: new Field(""),
        groupsColor: new Field(""),
        backgroundColor: new Field("#0f111d"),
        tableColor: new Field("#161e29"),
        widgetColor: new Field("#2c2c3329")
    })]
]);
