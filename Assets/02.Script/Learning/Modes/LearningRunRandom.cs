using UnityEngine;

public static class LearningRunRandom
{
    private const string StateKey = "learning.exploration.run.randomState";
    private const uint A = 1664525u;
    private const uint C = 1013904223u;

    public static void ResetNewRunSeed()
    {
        uint seed = (uint)System.DateTime.UtcNow.Ticks ^ (uint)Random.Range(1, int.MaxValue);
        if (seed == 0) seed = 1;
        Save(seed);
    }

    public static int Range(int minInclusive, int maxExclusive)
    {
        if (maxExclusive <= minInclusive) return minInclusive;
        uint next = Next();
        return minInclusive + (int)(next % (uint)(maxExclusive - minInclusive));
    }

    public static float Value()
    {
        return Next() / (float)uint.MaxValue;
    }

    private static uint Next()
    {
        uint state = Load();
        state = unchecked(A * state + C);
        if (state == 0) state = 1;
        Save(state);
        return state;
    }

    private static uint Load()
    {
        string raw = PlayerPrefs.GetString(StateKey, string.Empty);
        if (uint.TryParse(raw, out uint value) && value != 0) return value;
        ResetNewRunSeed();
        return Load();
    }

    private static void Save(uint value)
    {
        PlayerPrefs.SetString(StateKey, value.ToString());
        PlayerPrefs.Save();
    }

    public static void Clear()
    {
        PlayerPrefs.DeleteKey(StateKey);
        PlayerPrefs.Save();
    }
}
