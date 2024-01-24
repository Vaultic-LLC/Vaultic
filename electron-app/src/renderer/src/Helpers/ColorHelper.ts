import { RGBColor } from "@renderer/Types/Colors";

export function getLinearGradientFromColor(color: string)
{
	return `linear-gradient(90deg,
		color-mix(in srgb, ${color}, #867E7E 30%),
		color-mix(in srgb, ${color}, #000 30%))`;
}

export function getLinearGradientFromColorAndPercent(color: string, percent: number)
{
	return `linear-gradient(90deg,
		color-mix(in srgb, ${color}, #867E7E ${percent}%),
		color-mix(in srgb, ${color}, #000 ${percent}%))`;
}

function hex2dec(hex: string)
{
	const matched = hex.replace('#', '').match(/.{2}/g)
	if (!matched) throw new Error('Invalid hex string');
	return matched.map(n => parseInt(n, 16));
}

function rgb2hex(r: number, g: number, b: number)
{
	r = Math.round(r);
	g = Math.round(g);
	b = Math.round(b);
	r = Math.min(r, 255);
	g = Math.min(g, 255);
	b = Math.min(b, 255);
	return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

export function mixHexes(hex1: string, hex2: string, ratio: number = 0.5)
{
	if (ratio > 1 || ratio < 0) throw new Error('Invalid ratio');
	const [r1, g1, b1] = hex2dec(hex1);
	const [r2, g2, b2] = hex2dec(hex2);
	const r = Math.round(r1 * ratio + r2 * (1 - ratio));
	const g = Math.round(g1 * ratio + g2 * (1 - ratio));
	const b = Math.round(b1 * ratio + b2 * (1 - ratio));
	return rgb2hex(r, g, b);
}

export function hexToRgb(hex: string): RGBColor | null
{
	var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
	return result ? {
		r: parseInt(result[1], 16),
		g: parseInt(result[2], 16),
		b: parseInt(result[3], 16),
		alpha: 1
	} : null;
}

function componentToHex(c: number)
{
	var hex = c.toString(16);
	return hex.length == 1 ? "0" + hex : hex;
}

export function rgbToHex(r: number, g: number, b: number): string
{
	return "#" + componentToHex(r) + componentToHex(g) + componentToHex(b);
}
