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
}

export const emptyColorPalette: ColorPalette =
{
    id: new Field("DE9AB3B7-C861-4FF3-8900-EAE3ED9DA123"),
    active: new Field(false),
    isCreated: new Field(false),
    editable: new Field(false),
    passwordsColor: new Field({
        id: new Field("FAE7FB9C-D3AB-47BE-B3D3-C8158195FF1E"),
        primaryColor: new Field(""),
        secondaryColorOne: new Field(""),
        secondaryColorTwo: new Field(""),
    }),
    valuesColor: new Field({
        id: new Field("7A747973-84D8-45C9-93A8-23D2AEF372BC"),
        primaryColor: new Field(""),
        secondaryColorOne: new Field(""),
        secondaryColorTwo: new Field(""),
    }),
    filtersColor: new Field(""),
    groupsColor: new Field(""),
    backgroundColor: new Field("#0f111d"),
    tableColor: new Field("#161e29"),
    widgetColor: new Field("#2c2c3329"),
    errorColor: new Field("#ef4444")
}

export const colorPalettes: Map<string, Field<ColorPalette>> = new Map([
    ["EEA4135C-DE25-4B47-B678-486E2D64F675", new Field({
        id: new Field("EEA4135C-DE25-4B47-B678-486E2D64F675"),
        active: new Field(false),
        isCreated: new Field(true),
        editable: new Field(false),
        passwordsColor: new Field({
            id: new Field("C6EB1D64-6850-487A-AA4A-6D98E47C5E6F"),
            primaryColor: new Field("#bb29ff"),
            secondaryColorOne: new Field("#6612ec"),
            secondaryColorTwo: new Field("#2419bf"),
        }),
        valuesColor: new Field({
            id: new Field("108A20CB-B418-437D-8DBA-4A7FA6F18D19"),
            primaryColor: new Field("#03C4A1"),
            secondaryColorOne: new Field("#03a7c4"),
            secondaryColorTwo: new Field("#0374c4"),
        }),
        filtersColor: new Field("#7752FE"),
        groupsColor: new Field("#19A7CE"),
        backgroundColor: new Field("#0f111d"),
        tableColor: new Field("#161e29"),
        widgetColor: new Field("#2c2c3329"),
        errorColor: new Field("#ef4444")
    })],
    ["26BBFA34-E38F-4754-8413-4F9A2F6C7997", new Field({
        id: new Field("26BBFA34-E38F-4754-8413-4F9A2F6C7997"),
        active: new Field(true),
        isCreated: new Field(true),
        editable: new Field(false),
        passwordsColor: new Field({
            id: new Field("F6774027-09B3-42C2-A571-44213941AEFE"),
            primaryColor: new Field("#9A031E"),
            secondaryColorOne: new Field("#a712ec"),
            secondaryColorTwo: new Field("#530101"),
        }),
        valuesColor: new Field({
            id: new Field("4ADDFA87-32BD-4A1C-ACD8-20CBE0777937"),
            primaryColor: new Field("#BF3131"),
            secondaryColorOne: new Field("#5d0ca6"),
            secondaryColorTwo: new Field("#a712ec"),
        }),
        filtersColor: new Field("#FB8B24"),
        groupsColor: new Field("#E36414"),
        backgroundColor: new Field("#0f111d"),
        tableColor: new Field("#161e29"),
        widgetColor: new Field("#2c2c3329"),
        errorColor: new Field("#ef4444")
    })],
    ["4EFC4459-D9C8-45A2-A43D-87884E73CCB6", new Field({
        id: new Field("4EFC4459-D9C8-45A2-A43D-87884E73CCB6"),
        active: new Field(false),
        isCreated: new Field(true),
        editable: new Field(false),
        passwordsColor: new Field({
            id: new Field("9C2C5527-5166-4248-95F0-545C02DFC905"),
            primaryColor: new Field("#777777"),
            secondaryColorOne: new Field("#bbbbbb"),
            secondaryColorTwo: new Field("#111111"),
        }),
        valuesColor: new Field({
            id: new Field("06AD4C59-77B2-4B00-A198-594A1A4F7395"),
            primaryColor: new Field("#888888"),
            secondaryColorOne: new Field("#bbbbbb"),
            secondaryColorTwo: new Field("#111111"),
        }),
        filtersColor: new Field("#a9b3bb"),
        groupsColor: new Field("#8e9a98"),
        backgroundColor: new Field("#0f111d"),
        tableColor: new Field("#161e29"),
        widgetColor: new Field("#2c2c3329"),
        errorColor: new Field("#FFFFFF")
    })],
    ["EDD79A67-A9D0-48B8-B895-D1FD7DFA6180", new Field({
        id: new Field("EDD79A67-A9D0-48B8-B895-D1FD7DFA6180"),
        active: new Field(false),
        isCreated: new Field(false),
        editable: new Field(false),
        passwordsColor: new Field({
            id: new Field("0F8D4D3A-460A-4A50-8FB7-F4E3DB51EB54"),
            primaryColor: new Field(""),
            secondaryColorOne: new Field(""),
            secondaryColorTwo: new Field(""),
        }),
        valuesColor: new Field({
            id: new Field("4B8D096A-4CD2-48A6-AE82-A41BBBC9C733"),
            primaryColor: new Field(""),
            secondaryColorOne: new Field(""),
            secondaryColorTwo: new Field(""),
        }),
        filtersColor: new Field(""),
        groupsColor: new Field(""),
        backgroundColor: new Field("#0f111d"),
        tableColor: new Field("#161e29"),
        widgetColor: new Field("#2c2c3329"),
        errorColor: new Field("")
    })],
    ["343CD217-7910-4ED6-A93E-3C78957040C9", new Field({
        id: new Field("343CD217-7910-4ED6-A93E-3C78957040C9"),
        active: new Field(false),
        isCreated: new Field(false),
        editable: new Field(false),
        passwordsColor: new Field({
            id: new Field("5E943145-870D-4274-B5B9-DA89BD9B53E2"),
            primaryColor: new Field(""),
            secondaryColorOne: new Field(""),
            secondaryColorTwo: new Field(""),
        }),
        valuesColor: new Field({
            id: new Field("8FDA65C7-50BC-41B1-818E-EE8FEF5F56A0"),
            primaryColor: new Field(""),
            secondaryColorOne: new Field(""),
            secondaryColorTwo: new Field(""),
        }),
        filtersColor: new Field(""),
        groupsColor: new Field(""),
        backgroundColor: new Field("#0f111d"),
        tableColor: new Field("#161e29"),
        widgetColor: new Field("#2c2c3329"),
        errorColor: new Field("")
    })],
    ["5083AB8E-26B7-4FD9-9C48-8939D41625F4", new Field({
        id: new Field("5083AB8E-26B7-4FD9-9C48-8939D41625F4"),
        active: new Field(false),
        isCreated: new Field(false),
        editable: new Field(false),
        passwordsColor: new Field({
            id: new Field("E08D8DF6-E75C-4A60-8A0C-D31A49814DB4"),
            primaryColor: new Field(""),
            secondaryColorOne: new Field(""),
            secondaryColorTwo: new Field(""),
        }),
        valuesColor: new Field({
            id: new Field("16C44395-C5D0-48BE-B202-46C3529BB67C"),
            primaryColor: new Field(""),
            secondaryColorOne: new Field(""),
            secondaryColorTwo: new Field(""),
        }),
        filtersColor: new Field(""),
        groupsColor: new Field(""),
        backgroundColor: new Field("#0f111d"),
        tableColor: new Field("#161e29"),
        widgetColor: new Field("#2c2c3329"),
        errorColor: new Field("")
    })]
]);
