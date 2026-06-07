using System;
using System.Collections.Generic;

public enum RunStatKey
{
    BlindIndex,
    EnemyHp,
    Hands,
    Discards,
    Coins,

    ArcanaSelectedIndex,
    ConsumableCount,
}

public sealed class RunStats
{
    private readonly Dictionary<RunStatKey, int> _ints = new Dictionary<RunStatKey, int>();

    public event Action<RunStatKey, int> IntChanged;

    public int GetInt(RunStatKey key, int defaultValue = 0)
    {
        return _ints.TryGetValue(key, out int value) ? value : defaultValue;
    }

    public void SetInt(RunStatKey key, int value)
    {
        if (_ints.TryGetValue(key, out int existing) && existing == value)
        {
            return;
        }

        _ints[key] = value;
        IntChanged?.Invoke(key, value);
    }
}
