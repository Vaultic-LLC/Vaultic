import { RGBColor } from "../Types/Colors";

export function widgetBackgroundRGBA(): RGBColor
{
    return {
        r: 44,
        g: 44,
        b: 51,
        alpha: 0.16
    }
}

export function widgetBackgroundRGB(): RGBColor
{
    return {
        r: 44,
        g: 44,
        b: 51,
        alpha: 1
    }
}

export function widgetBackgroundHexString(): string
{
    return "#2c2c3329";
}

export function appHexColor(): string
{
    return "#0f111d"
}

export function widgetInputLabelBackgroundHexColor(): string
{
    return "#15151b";
}
