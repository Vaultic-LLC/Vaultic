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
    id: Field.create("DE9AB3B7-C861-4FF3-8900-EAE3ED9DA123"),
    active: Field.create(false),
    isCreated: Field.create(false),
    editable: Field.create(false),
    passwordsColor: Field.create({
        id: Field.create("FAE7FB9C-D3AB-47BE-B3D3-C8158195FF1E"),
        primaryColor: Field.create(""),
        secondaryColorOne: Field.create(""),
        secondaryColorTwo: Field.create(""),
    }),
    valuesColor: Field.create({
        id: Field.create("7A747973-84D8-45C9-93A8-23D2AEF372BC"),
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
    ["EEA4135C-DE25-4B47-B678-486E2D64F675", Field.create({
        id: Field.create("EEA4135C-DE25-4B47-B678-486E2D64F675"),
        active: Field.create(false),
        isCreated: Field.create(true),
        editable: Field.create(false),
        passwordsColor: Field.create({
            id: Field.create("C6EB1D64-6850-487A-AA4A-6D98E47C5E6F"),
            primaryColor: Field.create("#bb29ff"),
            secondaryColorOne: Field.create("#6612ec"),
            secondaryColorTwo: Field.create("#2419bf"),
        }),
        valuesColor: Field.create({
            id: Field.create("108A20CB-B418-437D-8DBA-4A7FA6F18D19"),
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
    ["26BBFA34-E38F-4754-8413-4F9A2F6C7997", Field.create({
        id: Field.create("26BBFA34-E38F-4754-8413-4F9A2F6C7997"),
        active: Field.create(true),
        isCreated: Field.create(true),
        editable: Field.create(false),
        passwordsColor: Field.create({
            id: Field.create("F6774027-09B3-42C2-A571-44213941AEFE"),
            primaryColor: Field.create("#9A031E"),
            secondaryColorOne: Field.create("#a712ec"),
            secondaryColorTwo: Field.create("#530101"),
        }),
        valuesColor: Field.create({
            id: Field.create("4ADDFA87-32BD-4A1C-ACD8-20CBE0777937"),
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
    ["4EFC4459-D9C8-45A2-A43D-87884E73CCB6", Field.create({
        id: Field.create("4EFC4459-D9C8-45A2-A43D-87884E73CCB6"),
        active: Field.create(false),
        isCreated: Field.create(true),
        editable: Field.create(false),
        passwordsColor: Field.create({
            id: Field.create("9C2C5527-5166-4248-95F0-545C02DFC905"),
            primaryColor: Field.create("#777777"),
            secondaryColorOne: Field.create("#bbbbbb"),
            secondaryColorTwo: Field.create("#111111"),
        }),
        valuesColor: Field.create({
            id: Field.create("06AD4C59-77B2-4B00-A198-594A1A4F7395"),
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
    ["EDD79A67-A9D0-48B8-B895-D1FD7DFA6180", Field.create({
        id: Field.create("EDD79A67-A9D0-48B8-B895-D1FD7DFA6180"),
        active: Field.create(false),
        isCreated: Field.create(false),
        editable: Field.create(false),
        passwordsColor: Field.create({
            id: Field.create("0F8D4D3A-460A-4A50-8FB7-F4E3DB51EB54"),
            primaryColor: Field.create(""),
            secondaryColorOne: Field.create(""),
            secondaryColorTwo: Field.create(""),
        }),
        valuesColor: Field.create({
            id: Field.create("4B8D096A-4CD2-48A6-AE82-A41BBBC9C733"),
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
    ["343CD217-7910-4ED6-A93E-3C78957040C9", Field.create({
        id: Field.create("343CD217-7910-4ED6-A93E-3C78957040C9"),
        active: Field.create(false),
        isCreated: Field.create(false),
        editable: Field.create(false),
        passwordsColor: Field.create({
            id: Field.create("5E943145-870D-4274-B5B9-DA89BD9B53E2"),
            primaryColor: Field.create(""),
            secondaryColorOne: Field.create(""),
            secondaryColorTwo: Field.create(""),
        }),
        valuesColor: Field.create({
            id: Field.create("8FDA65C7-50BC-41B1-818E-EE8FEF5F56A0"),
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
    ["5083AB8E-26B7-4FD9-9C48-8939D41625F4", Field.create({
        id: Field.create("5083AB8E-26B7-4FD9-9C48-8939D41625F4"),
        active: Field.create(false),
        isCreated: Field.create(false),
        editable: Field.create(false),
        passwordsColor: Field.create({
            id: Field.create("E08D8DF6-E75C-4A60-8A0C-D31A49814DB4"),
            primaryColor: Field.create(""),
            secondaryColorOne: Field.create(""),
            secondaryColorTwo: Field.create(""),
        }),
        valuesColor: Field.create({
            id: Field.create("16C44395-C5D0-48BE-B202-46C3529BB67C"),
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