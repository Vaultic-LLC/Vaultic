import * as TWEEN from '@tweenjs/tween.js'

export function tween<T extends Record<string, any>>(from: T, to: T, length: number, onUpdate: (obj: T) => void): Promise<void>
{
	return new Promise((resolve, _) =>
	{
		const tween = new TWEEN.Tween(from).to(to, length).onUpdate(onUpdate).start();

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
				if (tween.update(time))
				{
					requestAnimationFrame(animate);
				}
				else
				{
					resolve();
				}
			}
			else
			{
				resolve();
			}
		}

		requestAnimationFrame(animate);
	});
}
