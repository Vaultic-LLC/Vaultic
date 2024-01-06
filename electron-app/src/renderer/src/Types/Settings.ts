enum TimeMetric
{
    Never,
    Seconds,
    Minutes,
    Hours
}

type TimeInterval =
    {
        metric: TimeMetric,
        value: number
    };


export enum AutoLockTime
{
    OneMinute = "1 Minute",
    FiveMinutes = "5 Minuts",
    FifteenMinutes = "15 Minutes",
    ThirtyMinutes = "30 Minutes"
}