import * as TWEEN from '@tweenjs/tween.js'

export interface TweenObject<T extends Record<string, any>>
{
	from: T;
	to: T;
	length: number;
	onUpdate: (obj: T) => void;
}

export function tween<T extends Record<string, any>>(from: T, to: T, length: number, onUpdate: (obj: T) => void): Promise<void>
{
	return new Promise((resolve, _) =>
	{
		const tweenGroup = new TWEEN.Group();
		new TWEEN.Tween(from, tweenGroup).to(to, length).onUpdate(onUpdate).start();

		let startTime: number;
		function animate(time)
		{
			if (!startTime)
			{
				startTime = time;
			}

			const elapsedTime = time - startTime;
			if (elapsedTime < length + 100)
			{
				if (tweenGroup.update(time))
				{
					requestAnimationFrame(animate);
				}
				else
				{
					tweenGroup.removeAll();
					resolve();
				}
			}
			else
			{
				tweenGroup.removeAll();
				resolve();
			}
		}

		requestAnimationFrame(animate);
	});
}

export function tweenTogether(...objects: TweenObject<any>[])
{
	const tweenGroup = new TWEEN.Group();

	objects.forEach(o => new TWEEN.Tween(o.from, tweenGroup)
		.to(o.to, o.length)
		.onUpdate(o.onUpdate)
		.start());

	let startTime: number;
	function animate(time)
	{
		if (!startTime)
		{
			startTime = time;
		}

		const elapsedTime = time - startTime;
		if (elapsedTime < length + 100)
		{
			if (tweenGroup.update(time))
			{
				requestAnimationFrame(animate);
			}
			else
			{
				tweenGroup.removeAll();
			}
		}
		else
		{
			tweenGroup.removeAll();
		}
	}

	requestAnimationFrame(animate);
}
