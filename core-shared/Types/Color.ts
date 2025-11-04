export interface TableColorScheme
{
    /** Primary Color */
    p: string;
    /** Seconday Color One */
    o: string;
    /** Secondary Color Two */
    t: string;
}

export interface ColorPalette
{
    id: string;
    /** Active */
    a: boolean;
    /** Is Created */
    i: boolean;
    /** Editable */
    e: boolean;
    /** Password Color */
    p: TableColorScheme;
    /** Value Colors */
    v: TableColorScheme;
    /** Filter Color */
    f: string;
    /** Group Color */
    g: string;
    /** Error Color */
    r: string;
    /** Success Color */
    s: string;
}

export const defaultColorPalettes: Map<string, ColorPalette> = new Map([
    ["m84ezgwm7", {
        id: "m84ezgwm7",
        a: true,
        i: true,
        e: false,
        p: {
            p: "#f06e32",
            o: "#ac40de",
            t: "#c72525",
        },
        v: {
            p: "#d64e70",
            o: "#d84040",
            t: "#a712ec",
        },
        f: "#d94545",
        g: "#c74a93",
        r: "#ef4444",
        s: "#45d741"
    }],
    ["m84ezgwm3", {
        id: "m84ezgwm3",
        a: false,
        i: true,
        e: false,
        p: {
            p: "#bb29ff",
            o: "#6612ec",
            t: "#2419bf",
        },
        v: {
            p: "#03C4A1",
            o: "#03a7c4",
            t: "#0374c4",
        },
        f: "#7752FE",
        g: "#19A7CE",
        r: "#ef4444",
        s: "#45d741"
    }],
    ["m84ezgwn1", {
        id: "m84ezgwn1",
        a: false,
        i: true,
        e: false,
        p: {
            p: "#777777",
            o: "#bbbbbb",
            t: "#111111",
        },
        v: {
            p: "#888888",
            o: "#bbbbbb",
            t: "#111111",
        },
        f: "#a9b3bb",
        g: "#8e9a98",
        r: "#FFFFFF",
        s: "#FFFFFF"
    }]
]);

export const emptyUserColorPalettes: { [key: string]: ColorPalette } = {};
emptyUserColorPalettes["m84ezgwn4"] =
{
    id: "m84ezgwn4",
    a: false,
    i: false,
    e: false,
    p: {
        p: "",
        o: "",
        t: "",
    },
    v: {
        p: "",
        o: "",
        t: "",
    },
    f: "",
    g: "",
    r: "",
    s: ""
};

emptyUserColorPalettes["m84ezgwn7"] =
{
    id: "m84ezgwn7",
    a: false,
    i: false,
    e: false,
    p: {
        p: "",
        o: "",
        t: "",
    },
    v: {
        p: "",
        o: "",
        t: "",
    },
    f: "",
    g: "",
    r: "",
    s: ""
};

emptyUserColorPalettes["m84ezgwn10"] =
{
    id: "m84ezgwn10",
    a: false,
    i: false,
    e: false,
    p: {
        p: "",
        o: "",
        t: "",
    },
    v: {
        p: "",
        o: "",
        t: "",
    },
    f: "",
    g: "",
    r: "",
    s: ""
};
