import * as TWEEN from '@tweenjs/tween.js'

export interface TweenObject<T extends Record<string, any>>
{
    from: T;
    to: T;
    length: number;
    onUpdate: (obj: T) => void;
}

export function tween<T extends Record<string, any>>(from: T, to: T, length: number, onUpdate: (obj: T) => void): TWEEN.Group
{
    const tweenGroup = new TWEEN.Group();
    const tween = new TWEEN.Tween(from, tweenGroup).to(to, length).onUpdate(onUpdate).start();

    let startTime: number;
    function animate(time: number)
    {
        if (!tween.isPlaying())
        {
            return;
        }

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
    return tweenGroup;
}

export function tweenInfinite<T extends Record<string, any>>(from: T, to: T, length: number, group: TWEEN.Group, onUpdate: (obj: T) => void)
{
    new TWEEN.Tween(from, group).to(to, length).onUpdate(onUpdate).repeat(Infinity).yoyo(true).start();

    function animate(time: number)
    {
        group.update(time);
        requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
}

// TODO: don't use, doesn't work pretty sure
export function tweenTogether(...objects: TweenObject<any>[])
{
    const tweenGroup = new TWEEN.Group();

    objects.forEach(o => new TWEEN.Tween(o.from, tweenGroup)
        .to(o.to, o.length)
        .onUpdate(o.onUpdate)
        .start());

    let startTime: number;
    function animate(time: number)
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
