const myScreenWidth = 2560;
const myScreenHeight = 1370;

export function screenWidthIsAtRatioOfMax(ratio: number)
{
	return window.innerWidth / myScreenWidth <= ratio;
}

export function screenHeightIsAtRatioOfMax(ratio: number)
{
	return window.innerHeight / myScreenHeight <= ratio;
}
