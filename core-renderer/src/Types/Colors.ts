import { ColorPalette } from "@vaultic/shared/Types/Color";

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
    id: "m84ezgwm0",
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
}