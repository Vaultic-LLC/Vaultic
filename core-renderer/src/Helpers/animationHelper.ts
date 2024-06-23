class AnimationHelper
{
	constructor() { }

	public syncAnimations(animationName: string)
	{
		let animations = document.getAnimations() as CSSAnimation[];

		let startTime: CSSNumberish | null = null;
		animations.forEach(a =>
		{
			if (a.animationName?.includes(animationName))
			{
				if (startTime != null)
				{
					a.startTime = startTime;
				}
				else
				{
					startTime = a.startTime;
				}
			}
		});
	}
}

const animationHelper = new AnimationHelper();
export default animationHelper;
