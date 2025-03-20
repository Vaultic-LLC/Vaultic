export const defaultInputColor = "#9e9e9e";
export const defaultInputTextColor: string = "#e8e8e8"

export interface RGBColor
{
    r: number;
    g: number;
    b: number;
    alpha: number;
}

export interface TableColorScheme
{
    primaryColor: string;
    secondaryColorOne: string;
    secondaryColorTwo: string;
}

export interface ColorPalette
{
    id: string;
    active: boolean;
    isCreated: boolean;
    editable: boolean;
    passwordsColor: TableColorScheme;
    valuesColor: TableColorScheme;
    filtersColor: string;
    groupsColor: string;
    backgroundColor: string;
    tableColor: string;
    widgetColor: string;
    errorColor: string;
    successColor: string;
}

export const emptyColorPalette: ColorPalette =
{
    id: "m84ezgwm0",
    active: false,
    isCreated: false,
    editable: false,
    passwordsColor: {
        primaryColor: "",
        secondaryColorOne: "",
        secondaryColorTwo: "",
    },
    valuesColor: {
        primaryColor: "",
        secondaryColorOne: "",
        secondaryColorTwo: "",
    },
    filtersColor: "",
    groupsColor: "",
    backgroundColor: "#0f111d",
    tableColor: "#161e29",
    widgetColor: "#2c2c3329",
    errorColor: "",
    successColor: ""
}

export const defaultColorPalettes: Map<string, ColorPalette> = new Map([
    ["m84ezgwm3", {
        id: "m84ezgwm3",
        active: false,
        isCreated: true,
        editable: false,
        passwordsColor: {
            primaryColor: "#bb29ff",
            secondaryColorOne: "#6612ec",
            secondaryColorTwo: "#2419bf",
        },
        valuesColor: {
            primaryColor: "#03C4A1",
            secondaryColorOne: "#03a7c4",
            secondaryColorTwo: "#0374c4",
        },
        filtersColor: "#7752FE",
        groupsColor: "#19A7CE",
        backgroundColor: "#0f111d",
        tableColor: "#161e29",
        widgetColor: "#2c2c3329",
        errorColor: "#ef4444",
        successColor: "#45d741"
    }],
    ["m84ezgwm7", {
        id: "m84ezgwm7",
        active: true,
        isCreated: true,
        editable: false,
        passwordsColor: {
            primaryColor: "#9A031E",
            secondaryColorOne: "#a712ec",
            secondaryColorTwo: "#530101",
        },
        valuesColor: {
            primaryColor: "#BF3131",
            secondaryColorOne: "#5d0ca6",
            secondaryColorTwo: "#a712ec",
        },
        filtersColor: "#FB8B24",
        groupsColor: "#E36414",
        backgroundColor: "#0f111d",
        tableColor: "#161e29",
        widgetColor: "#2c2c3329",
        errorColor: "#ef4444",
        successColor: "#45d741"
    }],
    ["m84ezgwn1", {
        id: "m84ezgwn1",
        active: false,
        isCreated: true,
        editable: false,
        passwordsColor: {
            primaryColor: "#777777",
            secondaryColorOne: "#bbbbbb",
            secondaryColorTwo: "#111111",
        },
        valuesColor: {
            primaryColor: "#888888",
            secondaryColorOne: "#bbbbbb",
            secondaryColorTwo: "#111111",
        },
        filtersColor: "#a9b3bb",
        groupsColor: "#8e9a98",
        backgroundColor: "#0f111d",
        tableColor: "#161e29",
        widgetColor: "#2c2c3329",
        errorColor: "#FFFFFF",
        successColor: "#FFFFFF"
    }]
]);

export const emptyUserColorPalettes: Map<string, ColorPalette> = new Map([
    ["m84ezgwn4", {
        id: "m84ezgwn4",
        active: false,
        isCreated: false,
        editable: false,
        passwordsColor: {
            primaryColor: "",
            secondaryColorOne: "",
            secondaryColorTwo: "",
        },
        valuesColor: {
            primaryColor: "",
            secondaryColorOne: "",
            secondaryColorTwo: "",
        },
        filtersColor: "",
        groupsColor: "",
        backgroundColor: "#0f111d",
        tableColor: "#161e29",
        widgetColor: "#2c2c3329",
        errorColor: "",
        successColor: ""
    }],
    ["m84ezgwn7", {
        id: "m84ezgwn7",
        active: false,
        isCreated: false,
        editable: false,
        passwordsColor: {
            primaryColor: "",
            secondaryColorOne: "",
            secondaryColorTwo: "",
        },
        valuesColor: {
            primaryColor: "",
            secondaryColorOne: "",
            secondaryColorTwo: "",
        },
        filtersColor: "",
        groupsColor: "",
        backgroundColor: "#0f111d",
        tableColor: "#161e29",
        widgetColor: "#2c2c3329",
        errorColor: "",
        successColor: ""
    }],
    ["m84ezgwn10", {
        id: "m84ezgwn10",
        active: false,
        isCreated: false,
        editable: false,
        passwordsColor: {
            primaryColor: "",
            secondaryColorOne: "",
            secondaryColorTwo: "",
        },
        valuesColor: {
            primaryColor: "",
            secondaryColorOne: "",
            secondaryColorTwo: "",
        },
        filtersColor: "",
        groupsColor: "",
        backgroundColor: "#0f111d",
        tableColor: "#161e29",
        widgetColor: "#2c2c3329",
        errorColor: "",
        successColor: ""
    }]
]);