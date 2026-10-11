using System.Globalization;

public static class LearningNumberFormatter
{
    private static readonly string[] Units = { string.Empty, "K", "M", "B", "T" };

    public static string Format(int value)
    {
        return Format((double)value);
    }

    public static string Format(long value)
    {
        return Format((double)value);
    }

    public static string Format(float value)
    {
        return Format((double)value);
    }

    public static string Format(double value)
    {
        if (double.IsNaN(value) || double.IsInfinity(value)) return "0";

        double abs = System.Math.Abs(value);
        int unitIndex = 0;
        while (abs >= 1000d && unitIndex < Units.Length - 1)
        {
            value /= 1000d;
            abs /= 1000d;
            unitIndex++;
        }

        string number = unitIndex == 0
            ? value.ToString("0", CultureInfo.InvariantCulture)
            : value.ToString(abs >= 100d ? "0" : abs >= 10d ? "0.#" : "0.##", CultureInfo.InvariantCulture);

        return number + Units[unitIndex];
    }
}
